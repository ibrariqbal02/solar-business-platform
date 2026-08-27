import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",        // .mp4
  "video/mpeg",       // .mpeg
  "video/quicktime",  // .mov
  "video/x-msvideo",  // .avi
  "video/x-matroska", // .mkv
  "video/webm",       // .webm
  "video/ogg",        // .ogv
  "video/3gpp",       // .3gp
];

const MAX_VIDEO_SIZE_MB = 200;

const videoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported video type: ${file.mimetype}. Allowed: mp4, mpeg, mov, avi, mkv, webm, ogv, 3gp`
      )
    );
  }
};

/**
 * Multer instance for video uploads.
 * Uses memory storage so the buffer can be streamed directly to Cloudinary.
 * Max file size: 200 MB.
 *
 * Usage:
 *   multerVideo.single("video")   — single file, field name "video"
 */
const multerVideo = multer({
  storage: multer.memoryStorage(),
  fileFilter: videoFileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024 },
});

export default multerVideo;
