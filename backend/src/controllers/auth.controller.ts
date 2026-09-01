import { Request, Response } from "express";
import {
  registerAdminService,
  loginAdminService,
  refreshAccessTokenService,
  logoutAdminService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
  toSafeAdmin,
} from "../services/auth.service.js";
import Admin from "../models/admin.model.js";
import { issueCsrfCookie } from "../middleware/csrf.middleware.js";


const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax",
  path:     "/api/auth",           // cookie only sent to auth endpoints
  expires:  expiresAt,
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax",
  path:     "/api/auth",
});



const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (pw: string) =>
  pw.length >= 8;


export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Guard: require a secret registration key so this endpoint is not publicly open
    const providedKey = req.headers["x-registration-key"] as string | undefined;
    const expectedKey = process.env.ADMIN_REGISTRATION_KEY;
    if (!expectedKey || providedKey !== expectedKey) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const { name, email, password } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    if (!email?.trim() || !isValidEmail(email.trim())) {
      res.status(400).json({ success: false, message: "Valid email is required" });
      return;
    }
    if (!password || !isStrongPassword(password)) {
      res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      return;
    }

    // Role must never come from req.body — always default to "admin"
    const admin = await registerAdminService(name, email, password, "admin");

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: admin,
    });
  } catch (error: any) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 2. Login ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Returns: { accessToken, admin }
 * Sets:    HttpOnly refreshToken cookie
 */
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res.status(400).json({ success: false, message: "Email and password are required" });
      return;
    }

    const { safeAdmin, tokens } = await loginAdminService(email, password, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions(tokens.refreshExpiresAt));

    // Issue CSRF token alongside the refresh cookie so the client can
    // include it in subsequent refresh/logout requests.
    issueCsrfCookie(res);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: tokens.accessToken,
        admin: safeAdmin,
      },
    });
  } catch (error: any) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 3. Refresh access token ──────────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Reads refreshToken from HttpOnly cookie.
 * Returns: { accessToken }
 * Rotates: sets new refreshToken cookie, old token is revoked.
 */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

    if (!rawToken) {
      res.status(401).json({ success: false, message: "No refresh token provided" });
      return;
    }

    const { accessToken, newRefreshToken, refreshExpiresAt } =
      await refreshAccessTokenService(rawToken, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions(refreshExpiresAt));

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error: any) {
    // Clear the cookie on failure
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());
    const status = error.statusCode ?? 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 4. Logout ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Clears cookie and revokes the refresh token in DB.
 */
export const logoutAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await logoutAdminService(rawToken);

    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch {
    // Logout is always successful from client perspective
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());
    res.status(200).json({ success: true, message: "Logged out successfully" });
  }
};

// ─── 5. Get current admin ─────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <accessToken>
 * Returns safe admin profile.
 */
export const getCurrentAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = await Admin.findById(req.admin!.id);
    if (!admin) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }

    res.status(200).json({ success: true, data: toSafeAdmin(admin) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch admin profile" });
  }
};

// ─── 6. Change password ───────────────────────────────────────────────────────

/**
 * POST /api/auth/change-password
 * Requires: Authorization: Bearer <accessToken>
 * Body: { currentPassword, newPassword }
 * Revokes all refresh tokens on success.
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
      return;
    }
    if (!isStrongPassword(newPassword)) {
      res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
      return;
    }

    await changePasswordService(req.admin!.id, currentPassword, newPassword);

    // Clear refresh cookie — all sessions revoked, must log in again
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());

    res.status(200).json({ success: true, message: "Password changed successfully. Please log in again." });
  } catch (error: any) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 7. Forgot password ───────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 200 — never reveals whether email exists.
 * In production: email the rawToken link; never return it in the response.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const result = await forgotPasswordService(email);

    // ── Development: expose token for testing ─────────────────────────────────
    // !! NEVER expose this in production or test environments !!
    if (process.env.NODE_ENV === "development" && result) {
      res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
        _dev_resetToken: result.rawToken,   // DEVELOPMENT ONLY — remove before production
      });
      return;
    }
    // ── Production: generic response ──────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch {
    res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
    });
  }
};

// ─── 8. Reset password ────────────────────────────────────────────────────────

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 * Invalidates reset token and all refresh sessions on success.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token?.trim()) {
      res.status(400).json({ success: false, message: "Reset token is required" });
      return;
    }
    if (!newPassword || !isStrongPassword(newPassword)) {
      res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
      return;
    }

    await resetPasswordService(token, newPassword);

    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());

    res.status(200).json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (error: any) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
