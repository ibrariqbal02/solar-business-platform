import { Router } from "express";
import {
  createVideo,
  getVideos,
  getVideoById,
  getVideoByYoutubeId,
  updateVideo,
  deleteVideo,
  toggleVideoVisibility,
  toggleVideoFeatured,
} from "../controllers/video.controller";

const router = Router();

// POST   /api/videos                        — create
router.post("/", createVideo);

// GET    /api/videos                        — list (search, filter, sort, paginate)
router.get("/", getVideos);

// GET    /api/videos/youtube/:youtubeId     — lookup by YouTube video ID (before /:id)
router.get("/youtube/:youtubeId", getVideoByYoutubeId);

// GET    /api/videos/id/:id                 — get by MongoDB ID
router.get("/id/:id", getVideoById);

// PUT    /api/videos/:id                    — update
router.put("/:id", updateVideo);

// DELETE /api/videos/:id                    — soft hide (isVisible = false)
router.delete("/:id", deleteVideo);

// PATCH  /api/videos/:id/visibility         — toggle show/hide
router.patch("/:id/visibility", toggleVideoVisibility);

// PATCH  /api/videos/:id/featured           — toggle featured
router.patch("/:id/featured", toggleVideoFeatured);

export default router;
