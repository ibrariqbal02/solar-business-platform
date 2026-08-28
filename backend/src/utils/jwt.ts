import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";

// ─── Payload types ────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // adminId
  role: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;       // adminId
  jti: string;       // unique token ID (used to look up the DB record)
  type: "refresh";
}

// ─── Helpers to read env vars safely ─────────────────────────────────────────

const getSecret = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const getExpiry = (key: string, fallback: string): string => {
  return process.env[key] ?? fallback;
};

// ─── Access token ─────────────────────────────────────────────────────────────

export const signAccessToken = (adminId: string, role: string): string => {
  const payload: AccessTokenPayload = { sub: adminId, role, type: "access" };
  const secret = getSecret("JWT_ACCESS_SECRET");
  const expiresIn = getExpiry("JWT_ACCESS_EXPIRES_IN", "15m");
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const secret = getSecret("JWT_ACCESS_SECRET");
  const decoded = jwt.verify(token, secret) as JwtPayload;

  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded as AccessTokenPayload;
};

// ─── Refresh token ────────────────────────────────────────────────────────────

/**
 * Signs a refresh token JWT.
 * The raw JWT is sent to the client via HttpOnly cookie.
 * We store only a hash of it in the DB (see auth.service.ts).
 */
export const signRefreshToken = (adminId: string, jti: string): string => {
  const payload: RefreshTokenPayload = { sub: adminId, jti, type: "refresh" };
  const secret = getSecret("JWT_REFRESH_SECRET");
  const expiresIn = getExpiry("JWT_REFRESH_EXPIRES_IN", "7d");
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const secret = getSecret("JWT_REFRESH_SECRET");
  const decoded = jwt.verify(token, secret) as JwtPayload;

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded as RefreshTokenPayload;
};

// ─── Reset token (short-lived, single-use) ────────────────────────────────────

export interface ResetTokenPayload {
  sub: string;    // adminId
  type: "reset";
}

export const signResetToken = (adminId: string): string => {
  const payload: ResetTokenPayload = { sub: adminId, type: "reset" };
  const secret = getSecret("JWT_RESET_SECRET");
  const expiresIn = getExpiry("JWT_RESET_EXPIRES_IN", "15m");
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

export const verifyResetToken = (token: string): ResetTokenPayload => {
  const secret = getSecret("JWT_RESET_SECRET");
  const decoded = jwt.verify(token, secret) as JwtPayload;

  if (decoded.type !== "reset") {
    throw new Error("Invalid token type");
  }
  return decoded as ResetTokenPayload;
};
