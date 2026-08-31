import { Request, Response } from "express";
import { Readable } from "stream";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import Media from "../models/media.model.js";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ─── Upload (image/video/audio from buffer) ───────────────────────────────────
// POST /api/media/upload  — multipart, field name "file"
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided" });
      return;
    }

    const { folder = "solar-platform/media", alt } = req.body;
    const mime = req.file.mimetype;

    const resourceType: "image" | "video" | "raw" =
      mime.startsWith("image/") ? "image" :
      mime.startsWith("video/") || mime.startsWith("audio/") ? "video" : "raw";

    // Stream buffer directly to Cloudinary (Readable is imported at top of file)
    const result = await new Promise<Record<string, any>>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          transformation:
            resourceType === "image"
              ? [{ quality: "auto", fetch_format: "auto" }]
              : undefined,
        },
        (err, uploadResult) => {
          if (err || !uploadResult) return reject(err ?? new Error("Cloudinary upload failed"));
          resolve(uploadResult as Record<string, any>);
        }
      );
      Readable.from(req.file!.buffer).pipe(uploadStream);
    });

    const mediaType: "image" | "video" | "audio" | "document" =
      mime.startsWith("image/") ? "image" :
      mime.startsWith("video/") ? "video" :
      mime.startsWith("audio/") ? "audio" : "document";

    const media = await Media.create({
      filename:     req.file.originalname,
      url:          result["secure_url"],
      publicId:     result["public_id"],
      resourceType: mediaType,
      format:       result["format"],
      size:         result["bytes"] ?? req.file.size,
      width:        result["width"],
      height:       result["height"],
      duration:     result["duration"],
      alt:          alt?.trim(),
      folder,
      uploadedBy:   req.admin?.id ? new mongoose.Types.ObjectId(req.admin.id) : undefined,
    });

    res.status(201).json({ success: true, message: "Media uploaded", data: media });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
};

// ─── List ─────────────────────────────────────────────────────────────────────
// GET /api/media?type=image&page=1&limit=20
export const getMediaList = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { isActive: true };

    const allowedTypes = ["image", "video", "audio", "document"];
    if (req.query.type && allowedTypes.includes(req.query.type as string)) {
      filter.resourceType = req.query.type;
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [media, total] = await Promise.all([
      Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Media.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch media", error: error.message });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
// DELETE /api/media/:id
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid media ID" });
      return;
    }

    const media = await Media.findById(id);
    if (!media) {
      res.status(404).json({ success: false, message: "Media not found" });
      return;
    }

    // Use "video" resource_type for both video and audio on Cloudinary
    const cloudinaryType: "image" | "video" | "raw" =
      media.resourceType === "image" ? "image" :
      media.resourceType === "video" || media.resourceType === "audio" ? "video" : "raw";

    await cloudinary.uploader.destroy(media.publicId, { resource_type: cloudinaryType });
    await media.deleteOne();

    res.status(200).json({ success: true, message: "Media deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete media", error: error.message });
  }
};
