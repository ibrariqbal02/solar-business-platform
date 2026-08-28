import { Router } from "express";
import {
  createFAQ,
  getFAQs,
  getActiveFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  toggleFAQStatus,
  reorderFAQs,
} from "../controllers/faq.controller";

const router = Router();

// POST   /api/faqs                — create
router.post("/", createFAQ);

// GET    /api/faqs                — list all (search, filter, paginate)
router.get("/", getFAQs);

// GET    /api/faqs/active         — public: active FAQs only (before /:id)
router.get("/active", getActiveFAQs);

// PATCH  /api/faqs/reorder        — bulk reorder (before /:id)
router.patch("/reorder", reorderFAQs);

// GET    /api/faqs/:id            — get by ID
router.get("/:id", getFAQById);

// PUT    /api/faqs/:id            — update
router.put("/:id", updateFAQ);

// DELETE /api/faqs/:id            — soft delete
router.delete("/:id", deleteFAQ);

// PATCH  /api/faqs/:id/status     — toggle active/inactive
router.patch("/:id/status", toggleFAQStatus);

export default router;
