import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt.js";
import Admin from "../models/admin.model.js";

// ─── Extend Express Request ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        role: string;
      };
    }
  }
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Validates the Bearer access token from the Authorization header.
 * Attaches req.admin = { id, role } on success.
 * Returns 401 for missing/invalid tokens, 403 for inactive accounts.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7);
    let payload: AccessTokenPayload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({ success: false, message: "Invalid or expired access token" });
      return;
    }

    // Verify admin still exists and is active
    const admin = await Admin.findById(payload.sub).select("isActive role");
    if (!admin || !admin.isActive) {
      res.status(403).json({ success: false, message: "Account not found or deactivated" });
      return;
    }

    req.admin = { id: payload.sub, role: admin.role };
    next();
  } catch {
    res.status(500).json({ success: false, message: "Authentication error" });
  }
};

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Role-based access control. Must be used after requireAuth.
 * Usage: router.delete("/...", requireAuth, requireRole("super_admin"), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    if (!allowedRoles.includes(req.admin.role)) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
      return;
    }
    next();
  };
};
