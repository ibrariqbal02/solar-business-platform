/**
 * csrf.middleware.ts
 *
 * Double-submit cookie CSRF protection for cookie-based state-changing routes
 * (refresh, logout).
 *
 * Pattern:
 *  1. Client reads the `csrf-token` cookie (non-HttpOnly, JS-readable).
 *  2. Client sends the value in the `x-csrf-token` request header.
 *  3. This middleware compares the two — a cross-origin attacker cannot read
 *     the cookie value, so the header check blocks CSRF requests.
 *
 * In test/development the check is skipped so automated tests can run without
 * managing CSRF tokens.
 */
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME        = "x-csrf-token";

/** Length of the random CSRF token in bytes (produces 32-char hex string). */
const TOKEN_BYTES = 16;

/**
 * Attach a fresh CSRF token cookie on every auth response that sets a
 * refreshToken cookie (login).  Call this helper from the login handler
 * to issue the initial token.
 */
export const issueCsrfCookie = (res: Response): string => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,            // must be readable by JS
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/api/auth",
  });
  return token;
};

/**
 * Middleware: verify the CSRF double-submit cookie on state-changing routes.
 * Skipped in `development` and `test` environments.
 */
export const verifyCsrf = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const env = process.env.NODE_ENV;
  if (env === "development" || env === "test") {
    return next();
  }

  const cookieToken  = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken  = req.headers[CSRF_HEADER_NAME]   as string | undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ success: false, message: "CSRF token missing" });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ success: false, message: "CSRF token mismatch" });
    return;
  }

  next();
};
