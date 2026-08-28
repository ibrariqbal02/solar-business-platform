import { Request, Response } from "express";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import Media from "../models/media.model.js";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ─── Upload (image/video/audio from buffer) ───────────────────────────────────
// POST /api/media/upload  — multipart, field name depends on type
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: "No file provided" }); return; }

    const { folder = "solar-platform/media", alt } = req.body;
    const mime = req.file.mimetype;
    const resourceType: "image" | "video" | "raw" =
      mime.startsWith("image/") ? "image" :
      mime.startsWith("video/") || mime.startsWith("audio/") ? "video" : "raw";

    // Stream to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType, transformation: resourceType === "image" ? [{ quality: "auto", fetch_format: "auto" }] : undefined },
        (err, res) => err ? reject(err) : resolve(res)
      );
      const { Readable } = require("stream");
      Readable.from(req.file!.buffer).pipe(stream);
    });

    const mediaType: "image" | "video" | "audio" | "document" =
      mime.startsWith("image/") ? "image" :
      mime.startsWith("video/") ? "video" :
      mime.startsWith("audio/") ? "audio" : "document";

    const media = await Media.create({
      filename:     req.file.originalname,
      url:          result.secure_url,
      publicId:     result.public_id,
      resourceType: mediaType,
      format:       result.format,
      size:         result.bytes ?? req.file.size,
      width:        result.width,
      height:       result.height,
      duration:     result.duration,
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
export const getMediaList = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { isActive: true };
    if (req.query.type) filter.resourceType = req.query.type;
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [media, total] = await Promise.all([
      Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Media.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, data: media,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch media", error: error.message });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid media ID" }); return; }
    const media = await Media.findById(id);
    if (!media) { res.status(404).json({ success: false, message: "Media not found" }); return; }

    const cloudinaryType = media.resourceType === "image" ? "image" : "video";
    await cloudinary.uploader.destroy(media.publicId, { resource_type: cloudinaryType });
    await media.deleteOne();

    res.status(200).json({ success: true, message: "Media deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete media", error: error.message });
  }
};
