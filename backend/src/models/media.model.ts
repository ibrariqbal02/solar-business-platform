import mongoose, { Document, Schema } from "mongoose";

export type MediaType = "image" | "video" | "audio" | "document";

export interface IMedia extends Document {
  filename: string;
  url: string;
  publicId: string;          // Cloudinary public_id
  resourceType: MediaType;
  format: string;            // jpg, png, mp4 …
  size: number;              // bytes
  width?: number;
  height?: number;
  duration?: number;         // seconds (video/audio)
  alt?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  folder: string;            // Cloudinary folder path
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    filename:     { type: String, required: true, trim: true },
    url:          { type: String, required: true, trim: true },
    publicId:     { type: String, required: true, unique: true, trim: true },
    resourceType: { type: String, enum: ["image", "video", "audio", "document"], required: true, index: true },
    format:       { type: String, trim: true },
    size:         { type: Number, default: 0 },
    width:        { type: Number },
    height:       { type: Number },
    duration:     { type: Number },
    alt:          { type: String, trim: true },
    uploadedBy:   { type: Schema.Types.ObjectId, ref: "Admin" },
    folder:       { type: String, trim: true, default: "solar-platform" },
    isActive:     { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

mediaSchema.index({ resourceType: 1, createdAt: -1 });

const Media = mongoose.model<IMedia>("Media", mediaSchema);
export default Media;
