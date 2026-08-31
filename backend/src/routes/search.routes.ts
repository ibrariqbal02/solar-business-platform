import { Router } from "express";
import rateLimit from "express-rate-limit";
import { globalSearch } from "../controllers/search.controller.js";

const searchLimiter = rateLimit({
  windowMs:        60 * 1000,
  limit:           process.env.NODE_ENV === "production" ? 20 : 100,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many search requests. Please slow down." },
});

const router = Router();

// Public — no auth required, but rate-limited
router.get("/", searchLimiter, globalSearch);

export default router;
