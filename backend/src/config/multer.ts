import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_IMAGE_SIZE_MB = 5;

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported image type: ${file.mimetype}. Allowed: jpeg, jpg, png, webp, gif`
      )
    );
  }
};

/**
 * Multer instance for image uploads.
 * Uses memory storage so the buffer can be streamed directly to Cloudinary.
 * Max file size: 5 MB.
 *
 * Usage:
 *   multerImage.single("image")   — single file, field name "image"
 *   multerImage.array("images", 10) — up to 10 files, field name "images"
 */
const multerImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 },
});

export default multerImage;
