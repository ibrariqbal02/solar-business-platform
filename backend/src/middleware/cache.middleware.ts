/**
 * cache.middleware.ts
 *
 * Thin wrapper around apicache that adds TypeScript types and a single
 * consistent TTL for all public GET caches in this project.
 *
 * Usage in a router:
 *   import { cachePublic } from "../middleware/cache.middleware.js";
 *   router.get("/", cachePublic, myController);
 *
 * Cache is keyed by full request URL so different query strings get their
 * own entries. TTL is set to 60 seconds — short enough that content stays
 * reasonably fresh, long enough to absorb burst traffic on public routes.
 *
 * Only public GET routes should use this middleware. Never apply it to
 * admin/protected routes or mutation endpoints.
 */
import apicache from "apicache";
import type { RequestHandler } from "express";

// Only cache successful responses (2xx status codes)
const cache = apicache.options({ statusCodes: { include: [200] } }).middleware;

/** 60-second in-memory cache for public GET routes. */
export const cachePublic: RequestHandler = cache("60 seconds") as RequestHandler;
