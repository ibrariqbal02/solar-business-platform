import { Router } from "express";
import {
  createVideoCategory,
  getVideoCategories,
  getVideoCategoryById,
  getVideoCategoryBySlug,
  updateVideoCategory,
  deleteVideoCategory,
  toggleVideoCategoryStatus,
} from "../controllers/video-category.controller";

const router = Router();

// POST   /api/video-categories              — create
router.post("/", createVideoCategory);

// GET    /api/video-categories              — list all (pagination, search, filter)
router.get("/", getVideoCategories);

// GET    /api/video-categories/slug/:slug   — get by slug (before /:id to avoid conflict)
router.get("/slug/:slug", getVideoCategoryBySlug);

// GET    /api/video-categories/id/:id       — get by ID
router.get("/id/:id", getVideoCategoryById);

// PUT    /api/video-categories/:id          — update
router.put("/:id", updateVideoCategory);

// DELETE /api/video-categories/:id          — soft delete
router.delete("/:id", deleteVideoCategory);

// PATCH  /api/video-categories/:id/status   — toggle active/inactive
router.patch("/:id/status", toggleVideoCategoryStatus);

export default router;
