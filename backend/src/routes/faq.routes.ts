import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { cachePublic } from "../middleware/cache.middleware.js";
import {
  createFAQ,
  getFAQs,
  getActiveFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  toggleFAQStatus,
  reorderFAQs,
} from "../controllers/faq.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",        getFAQs);
router.get("/active",  cachePublic, getActiveFAQs);
router.get("/:id",     getFAQById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",            requireAuth, createFAQ);
router.patch( "/reorder",     requireAuth, reorderFAQs);
router.put(   "/:id",         requireAuth, updateFAQ);
router.delete("/:id",         requireAuth, deleteFAQ);
router.patch( "/:id/status",  requireAuth, toggleFAQStatus);

export default router;
