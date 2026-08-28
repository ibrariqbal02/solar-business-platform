import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createVideoCategory,
  getVideoCategories,
  getVideoCategoryById,
  getVideoCategoryBySlug,
  updateVideoCategory,
  deleteVideoCategory,
  toggleVideoCategoryStatus,
} from "../controllers/video-category.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",              getVideoCategories);
router.get("/slug/:slug",    getVideoCategoryBySlug);
router.get("/id/:id",        getVideoCategoryById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",           requireAuth, createVideoCategory);
router.put(   "/:id",        requireAuth, updateVideoCategory);
router.delete("/:id",        requireAuth, deleteVideoCategory);
router.patch( "/:id/status", requireAuth, toggleVideoCategoryStatus);

export default router;
