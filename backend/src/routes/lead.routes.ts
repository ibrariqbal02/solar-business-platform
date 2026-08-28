import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { submitLead, getAllLeads, getLeadById, updateLead, deleteLead, leadSubmitLimiter } from "../controllers/lead.controller.js";

const router = Router();

// Public
router.post("/", leadSubmitLimiter, submitLead);

// Admin
router.get("/",     requireAuth, getAllLeads);
router.get("/:id",  requireAuth, getLeadById);
router.put("/:id",  requireAuth, updateLead);
router.delete("/:id", requireAuth, deleteLead);

export default router;
