import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary";

export interface CloudinaryAudioResult {
  secure_url: string;
  public_id: string;
  format: string;
  duration: number;   // seconds
  bytes: number;
}

/**
 * Uploads an audio buffer to Cloudinary.
 *
 * @param buffer   - File buffer from multer memory storage
 * @param folder   - Cloudinary folder to upload into (e.g. "solar-platform/audio")
 * @param publicId - Optional custom public_id
 * @returns        CloudinaryAudioResult with secure_url, public_id, format, duration, bytes
 */
const uploadAudioToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<CloudinaryAudioResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "video", // Cloudinary uses "video" resource_type for audio files
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary audio upload failed"));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          duration: result.duration ?? 0,
          bytes: result.bytes,
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

export default uploadAudioToCloudinary;
