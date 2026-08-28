import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  registerAdmin,
  loginAdmin,
  refreshAccessToken,
  logoutAdmin,
  getCurrentAdmin,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** Strict limiter for login — 10 attempts per 15 minutes per IP */
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  limit:           10,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many login attempts. Please try again later." },
});

/** Moderate limiter for password reset requests — 5 per hour */
const forgotPasswordLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  limit:           5,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many reset requests. Please try again later." },
});

/** Registration limiter — 3 per hour per IP */
const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  limit:           3,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many registration attempts." },
});

// ─── Public routes ────────────────────────────────────────────────────────────

// POST /api/auth/register      — initial/protected admin creation
router.post("/register", registerLimiter, registerAdmin);

// POST /api/auth/login         — issue access + refresh tokens
router.post("/login", loginLimiter, loginAdmin);

// POST /api/auth/refresh       — rotate refresh token, issue new access token
router.post("/refresh", refreshAccessToken);

// POST /api/auth/logout        — revoke refresh token, clear cookie
router.post("/logout", logoutAdmin);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// ─── Protected routes (require valid access token) ────────────────────────────

// GET  /api/auth/me            — current admin profile
router.get("/me", requireAuth, getCurrentAdmin);

// POST /api/auth/change-password
router.post("/change-password", requireAuth, changePassword);

export default router;
