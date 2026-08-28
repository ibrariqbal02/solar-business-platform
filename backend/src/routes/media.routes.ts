import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadMedia, getMediaList, deleteMedia } from "../controllers/media.controller.js";

// 50 MB limit — handles images + videos
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.post("/upload",  requireAuth, upload.single("file"), uploadMedia);
router.get("/",         requireAuth, getMediaList);
router.delete("/:id",   requireAuth, deleteMedia);

export default router;
