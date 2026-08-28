import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getPublicSettings, getAdminSettings, updateSettings } from "../controllers/settings.controller.js";

// Accept logo + favicon as separate fields
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

// Public
router.get("/",         getPublicSettings);

// Admin
router.get("/admin",    requireAuth, getAdminSettings);
router.put("/",         requireAuth, upload.fields([{ name: "logo", maxCount: 1 }, { name: "favicon", maxCount: 1 }]), updateSettings);

export default router;
