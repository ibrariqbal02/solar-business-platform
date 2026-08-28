import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import AnalyticsEvent from "../models/analytics-event.model.js";

const ALLOWED_EVENT_TYPES = [
  "product_view",
  "whatsapp_click",
  "technical_support_click",
  "video_call_request",
  "site_visit_request",
  "installation_request",
  "contact_form_submitted",
  "youtube_video_clicked",
  "product_enquiry",
  "page_view",
  "search",
] as const;

type AllowedEventType = typeof ALLOWED_EVENT_TYPES[number];

// ─── PUBLIC: Track event ──────────────────────────────────────────────────────
// POST /api/analytics/events
export const trackEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, productId, metadata } = req.body;

    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)) {
      res.status(400).json({ success: false, message: `eventType must be one of: ${ALLOWED_EVENT_TYPES.join(", ")}` });
      return;
    }

    // Sanitise metadata — reject anything that looks like a MongoDB operator
    let safeMeta: Record<string, unknown> | undefined;
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      safeMeta = {};
      for (const [k, v] of Object.entries(metadata as Record<string, unknown>)) {
        if (!k.startsWith("$")) safeMeta[k] = v;
      }
    }

    await AnalyticsEvent.create({
      eventType,
      product:   productId ?? undefined,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      sessionId: req.headers["x-session-id"] as string | undefined,
      metadata:  safeMeta,
    });

    res.status(201).json({ success: true, message: "Event tracked" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to track event", error: error.message });
  }
};

// ─── ADMIN: Summary ───────────────────────────────────────────────────────────
// GET /api/analytics?days=30
export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventCounts, topProducts] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { eventType: "product_view", createdAt: { $gte: since }, product: { $exists: true } } },
        { $group: { _id: "$product", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
        { $unwind: "$product" },
        { $project: { views: 1, "product.name": 1, "product.slug": 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: { period: `${days} days`, eventCounts, topProducts },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch analytics", error: error.message });
  }
};

// Rate limiter for public event tracking
export const analyticsLimiter = rateLimit({
  windowMs:        60 * 1000,
  limit:           process.env.NODE_ENV === "production" ? 30 : 200,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many analytics events" },
});
