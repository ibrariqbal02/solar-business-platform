import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { adminWriteLimiter } from "../middleware/userRateLimit.middleware.js";
import { submitLead, getAllLeads, getLeadById, updateLead, deleteLead, leadSubmitLimiter } from "../controllers/lead.controller.js";

const router = Router();

// Public
router.post("/", leadSubmitLimiter, submitLead);

// Admin
router.get("/",     requireAuth, getAllLeads);
router.get("/:id",  requireAuth, getLeadById);
router.put("/:id",  requireAuth, adminWriteLimiter, updateLead);
router.delete("/:id", requireAuth, adminWriteLimiter, deleteLead);

export default router;
