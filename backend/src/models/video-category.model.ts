import mongoose, { Document, Schema } from "mongoose";

export interface IVideoCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoCategorySchema = new Schema<IVideoCategory>(
  {
    name: {
      type: String,
      required: [true, "Video category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
videoCategorySchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slug = (this.name as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const VideoCategory = mongoose.model<IVideoCategory>("VideoCategory", videoCategorySchema);

export default VideoCategory;
