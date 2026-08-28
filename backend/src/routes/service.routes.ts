import { Router } from "express";
import multerImage from "../config/multer.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createService,
  getServices,
  getServiceById,
  getServiceBySlug,
  updateService,
  deleteService,
  toggleServiceStatus,
} from "../controllers/service.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",              getServices);
router.get("/slug/:slug",    getServiceBySlug);
router.get("/id/:id",        getServiceById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",           requireAuth, multerImage.single("image"), createService);
router.put(   "/:id",        requireAuth, multerImage.single("image"), updateService);
router.delete("/:id",        requireAuth, deleteService);
router.patch( "/:id/status", requireAuth, toggleServiceStatus);

export default router;
