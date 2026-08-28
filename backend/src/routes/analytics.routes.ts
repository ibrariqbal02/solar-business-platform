import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { trackEvent, getAnalyticsSummary, analyticsLimiter } from "../controllers/analytics.controller.js";

const router = Router();

// Public — lightweight event ingestion
router.post("/events", analyticsLimiter, trackEvent);

// Admin — aggregated summary
router.get("/", requireAuth, getAnalyticsSummary);

export default router;
