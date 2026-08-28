import crypto from "crypto";
import Admin, { IAdmin } from "../models/admin.model.js";
import RefreshToken from "../models/refresh-token.model.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signResetToken,
  verifyResetToken,
} from "../utils/jwt.js";
import {
  hashPassword,
  comparePassword,
  generateJti,
  hashToken,
  generateRandomToken,
} from "../utils/password.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafeAdmin {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;    // raw JWT — sent via cookie only, never in JSON body
  refreshExpiresAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip all sensitive fields before sending admin data to client */
export const toSafeAdmin = (admin: IAdmin): SafeAdmin => ({
  _id: (admin._id as any).toString(),
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

/** Parse a duration string like "7d", "15m", "1h" into milliseconds */
const parseDurationMs = (value: string): number => {
  const unit = value.slice(-1);
  const num  = parseInt(value.slice(0, -1), 10);
  if (isNaN(num)) throw new Error(`Invalid duration: ${value}`);
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return num * (map[unit] ?? 1000);
};

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerAdminService = async (
  name: string,
  email: string,
  password: string,
  role: "super_admin" | "admin" | "editor" = "admin"
): Promise<SafeAdmin> => {
  const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw Object.assign(new Error("Email already registered"), { statusCode: 409 });

  const hashed = await hashPassword(password);
  const admin  = await Admin.create({
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    password: hashed,
    role,
  });

  return toSafeAdmin(admin);
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginAdminService = async (
  email: string,
  password: string,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<{ safeAdmin: SafeAdmin; tokens: TokenPair }> => {
  // Explicitly select password field (marked select:false in schema)
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );

  // Use constant-time comparison path regardless of whether admin exists
  const passwordMatch = admin
    ? await comparePassword(password, admin.password)
    : await comparePassword(password, "$2b$12$invalidhashfortimingnormalization");

  if (!admin || !passwordMatch) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }
  if (!admin.isActive) {
    throw Object.assign(new Error("Account is deactivated"), { statusCode: 403 });
  }

  // Update last login (non-blocking — don't await in hot path)
  Admin.findByIdAndUpdate(admin._id, { lastLoginAt: new Date() }).exec();

  const tokens = await createTokenPair(admin, meta);
  return { safeAdmin: toSafeAdmin(admin), tokens };
};

// ─── Token pair creation (used by login + refresh) ────────────────────────────

export const createTokenPair = async (
  admin: IAdmin,
  meta: { userAgent?: string; ipAddress?: string },
  revokeOldHash?: string   // pass previous tokenHash when rotating
): Promise<TokenPair> => {
  const adminId = (admin._id as any).toString();
  const jti     = generateJti();

  const refreshExpiryStr = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const refreshExpiresAt = new Date(Date.now() + parseDurationMs(refreshExpiryStr));

  const rawRefreshToken = signRefreshToken(adminId, jti);
  const tokenHash       = hashToken(rawRefreshToken);
  const accessToken     = signAccessToken(adminId, admin.role);

  // If rotating: revoke old token and link to successor
  if (revokeOldHash) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: revokeOldHash },
      { revokedAt: new Date(), replacedByToken: tokenHash }
    );
  }

  await RefreshToken.create({
    adminId:    admin._id,
    tokenHash,
    expiresAt:  refreshExpiresAt,
    userAgent:  meta.userAgent,
    ipAddress:  meta.ipAddress,
  });

  return { accessToken, refreshToken: rawRefreshToken, refreshExpiresAt };
};

// ─── Refresh ──────────────────────────────────────────────────────────────────

export const refreshAccessTokenService = async (
  rawRefreshToken: string,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<{ accessToken: string; newRefreshToken: string; refreshExpiresAt: Date }> => {
  // 1. Verify JWT signature + expiry
  const payload = verifyRefreshToken(rawRefreshToken);   // throws if invalid/expired

  // 2. Look up DB record
  const tokenHash  = hashToken(rawRefreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken) {
    throw Object.assign(new Error("Refresh token not found"), { statusCode: 401 });
  }
  if (storedToken.revokedAt) {
    // Possible token reuse attack — revoke entire family for this admin
    await RefreshToken.updateMany(
      { adminId: storedToken.adminId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
    throw Object.assign(new Error("Refresh token reuse detected — all sessions revoked"), { statusCode: 401 });
  }
  if (storedToken.expiresAt < new Date()) {
    throw Object.assign(new Error("Refresh token expired"), { statusCode: 401 });
  }

  // 3. Verify admin still active
  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw Object.assign(new Error("Account not found or deactivated"), { statusCode: 403 });
  }

  // 4. Rotate: revoke old, issue new pair
  const { accessToken, refreshToken: newRefreshToken, refreshExpiresAt } =
    await createTokenPair(admin, meta, tokenHash);

  return { accessToken, newRefreshToken, refreshExpiresAt };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutAdminService = async (rawRefreshToken?: string): Promise<void> => {
  if (!rawRefreshToken) return;   // already logged out — safe to call repeatedly
  try {
    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
  } catch {
    // Swallow errors — logout must always succeed from the client's perspective
  }
};

// ─── Change password ──────────────────────────────────────────────────────────

export const changePasswordService = async (
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const admin = await Admin.findById(adminId).select("+password");
  if (!admin) throw Object.assign(new Error("Admin not found"), { statusCode: 404 });

  const match = await comparePassword(currentPassword, admin.password);
  if (!match) {
    throw Object.assign(new Error("Current password is incorrect"), { statusCode: 400 });
  }

  const samePassword = await comparePassword(newPassword, admin.password);
  if (samePassword) {
    throw Object.assign(new Error("New password must be different from the current password"), { statusCode: 400 });
  }

  admin.password = await hashPassword(newPassword);
  await admin.save();

  // Revoke all refresh tokens so existing sessions must re-authenticate
  await RefreshToken.updateMany(
    { adminId, revokedAt: { $exists: false } },
    { revokedAt: new Date() }
  );
};

// ─── Forgot password ──────────────────────────────────────────────────────────

/**
 * Returns the raw reset token — the controller decides whether to log/email it.
 * In production this should be emailed; never returned in the API response.
 */
export const forgotPasswordService = async (
  email: string
): Promise<{ rawToken: string; adminId: string } | null> => {
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  // Always return null-like so the caller sends a generic response (no user enumeration)
  if (!admin || !admin.isActive) return null;

  const rawToken  = generateRandomToken(32);   // 64-char hex
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);   // 15 minutes

  admin.passwordResetToken    = tokenHash;
  admin.passwordResetExpiresAt = expiresAt;
  await admin.save();

  return { rawToken, adminId: (admin._id as any).toString() };
};

// ─── Reset password ───────────────────────────────────────────────────────────

export const resetPasswordService = async (
  rawToken: string,
  newPassword: string
): Promise<void> => {
  const tokenHash = hashToken(rawToken);

  const admin = await Admin.findOne({
    passwordResetToken:    tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+password +passwordResetToken +passwordResetExpiresAt");

  if (!admin) {
    throw Object.assign(new Error("Reset token is invalid or has expired"), { statusCode: 400 });
  }

  admin.password               = await hashPassword(newPassword);
  admin.passwordResetToken     = undefined;
  admin.passwordResetExpiresAt = undefined;
  await admin.save();

  // Revoke all refresh tokens after a password reset
  await RefreshToken.updateMany(
    { adminId: admin._id, revokedAt: { $exists: false } },
    { revokedAt: new Date() }
  );
};
