import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createVideo,
  getVideos,
  getVideoById,
  getVideoByYoutubeId,
  updateVideo,
  deleteVideo,
  toggleVideoVisibility,
  toggleVideoFeatured,
} from "../controllers/video.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",                      getVideos);
router.get("/youtube/:youtubeId",    getVideoByYoutubeId);
router.get("/id/:id",                getVideoById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",                   requireAuth, createVideo);
router.put(   "/:id",                requireAuth, updateVideo);
router.delete("/:id",                requireAuth, deleteVideo);
router.patch( "/:id/visibility",     requireAuth, toggleVideoVisibility);
router.patch( "/:id/featured",       requireAuth, toggleVideoFeatured);

export default router;
