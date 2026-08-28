import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  title: string;
  description?: string;
  youtubeVideoId: string;          // e.g. "dQw4w9WgXcQ"
  youtubeUrl: string;              // full watch URL
  thumbnail?: string;              // custom thumbnail URL (falls back to YouTube auto-thumb)
  category: mongoose.Types.ObjectId;
  publishedAt: Date;               // YouTube publish date or admin-set date
  duration?: string;               // e.g. "5:34"
  tags: string[];
  isVisible: boolean;              // controls public display
  isFeatured: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    youtubeVideoId: {
      type: String,
      required: [true, "YouTube video ID is required"],
      trim: true,
      unique: true,
      index: true,
    },
    youtubeUrl: {
      type: String,
      required: [true, "YouTube URL is required"],
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "VideoCategory",
      required: [true, "Video category is required"],
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index for search
videoSchema.index({ title: "text", description: "text" });
videoSchema.index({ isVisible: 1, isFeatured: -1, publishedAt: -1 });

const Video = mongoose.model<IVideo>("Video", videoSchema);

export default Video;
