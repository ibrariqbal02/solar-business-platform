import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary.js";

export interface CloudinaryImageResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Uploads an image buffer to Cloudinary.
 *
 * @param buffer  - File buffer from multer memory storage
 * @param folder  - Cloudinary folder to upload into (e.g. "solar-platform/categories")
 * @param publicId - Optional custom public_id; Cloudinary auto-generates one if omitted
 * @returns       CloudinaryImageResult with secure_url, public_id, format, dimensions
 */
const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<CloudinaryImageResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary image upload failed"));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

export default uploadToCloudinary;
