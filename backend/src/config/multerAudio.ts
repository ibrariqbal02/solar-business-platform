import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/mpeg",       // .mp3
  "audio/mp4",        // .m4a
  "audio/wav",        // .wav
  "audio/x-wav",      // .wav (alternate)
  "audio/ogg",        // .ogg
  "audio/webm",       // .webm audio
  "audio/aac",        // .aac
  "audio/flac",       // .flac
];

const MAX_AUDIO_SIZE_MB = 50;

const audioFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported audio type: ${file.mimetype}. Allowed: mp3, m4a, wav, ogg, webm, aac, flac`
      )
    );
  }
};

/**
 * Multer instance for audio uploads.
 * Uses memory storage so the buffer can be streamed directly to Cloudinary.
 * Max file size: 50 MB.
 *
 * Usage:
 *   multerAudio.single("audio")   — single file, field name "audio"
 */
const multerAudio = multer({
  storage: multer.memoryStorage(),
  fileFilter: audioFileFilter,
  limits: { fileSize: MAX_AUDIO_SIZE_MB * 1024 * 1024 },
});

export default multerAudio;
