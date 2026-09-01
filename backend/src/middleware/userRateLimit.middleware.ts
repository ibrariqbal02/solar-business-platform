/**
 * userRateLimit.middleware.ts
 *
 * Per-authenticated-user rate limiter for protected write routes
 * (POST/PUT/PATCH/DELETE on products, articles, leads).
 *
 * Keys on req.admin.id so that multiple admins don't share a bucket.
 * Falls back to IP (via ipKeyGenerator for IPv6 safety) if req.admin is not
 * yet populated (shouldn't happen on authenticated routes, but is defensive).
 *
 * Limits: 100 write operations per 15 minutes per admin.
 * In test mode the limit is relaxed to avoid false failures in test suites.
 */
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";

export const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:    process.env.NODE_ENV === "test" ? 10_000 : 100,
  keyGenerator: (req: Request): string => {
    // req.admin is set by requireAuth which runs before this limiter.
    // Use ipKeyGenerator for the IP fallback so express-rate-limit's IPv6
    // normalisation logic is applied and ERR_ERL_KEY_GEN_IPV6 is not thrown.
    return req.admin?.id ?? ipKeyGenerator(req.ip ?? "unknown");
  },
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many write requests. Please slow down and try again later.",
  },
  // Skip rate limiting in development
  skip: () => process.env.NODE_ENV === "development",
});
