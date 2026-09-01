import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getLegalPage, updateLegalPage } from "../controllers/legal.controller.js";

const router = Router();

// GET  /api/legal/:type   — public
router.get("/:type", getLegalPage);

// PUT  /api/legal/:type   — admin only
router.put("/:type", requireAuth, updateLegalPage);

export default router;
