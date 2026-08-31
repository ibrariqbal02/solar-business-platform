import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary.js";

export interface CloudinaryVideoResult {
  secure_url: string;
  public_id: string;
  format: string;
  duration: number;   // seconds
  width: number;
  height: number;
  bytes: number;
}

/**
 * Uploads a video buffer to Cloudinary.
 *
 * @param buffer   - File buffer from multer memory storage
 * @param folder   - Cloudinary folder to upload into (e.g. "solar-platform/videos")
 * @param publicId - Optional custom public_id
 * @returns        CloudinaryVideoResult with secure_url, public_id, format, duration, dimensions, bytes
 */
const uploadVideoToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<CloudinaryVideoResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "video",
        transformation: [{ quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary video upload failed"));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          duration: result.duration ?? 0,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

export default uploadVideoToCloudinary;
