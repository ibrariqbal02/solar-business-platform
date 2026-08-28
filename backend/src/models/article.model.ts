import mongoose, { Document, Schema } from "mongoose";

export type ArticleStatus = "draft" | "published" | "unpublished";

export interface IArticle extends Document {
  title: string;
  slug: string;
  featuredImage?: string;
  featuredImagePublicId?: string;
  excerpt?: string;                      // short teaser / meta description
  description?: string;                  // main article body (HTML / markdown)
  technicalExplanation?: string;         // in-depth technical content
  troubleshootingSteps: string[];        // ordered list of steps
  safetyInformation?: string;            // safety warnings / notes
  category: mongoose.Types.ObjectId;
  relatedVideos: mongoose.Types.ObjectId[];
  relatedProducts: mongoose.Types.ObjectId[];
  tags: string[];
  status: ArticleStatus;
  publishedAt?: Date;
  readTimeMinutes?: number;              // auto or manually set
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    title: {
      type: String,
      required: [true, "Article title is required"],
      trim: true,
      unique: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    featuredImage: {
      type: String,
      trim: true,
    },
    featuredImagePublicId: {
      type: String,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    technicalExplanation: {
      type: String,
      trim: true,
    },
    troubleshootingSteps: {
      type: [String],
      default: [],
    },
    safetyInformation: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ArticleCategory",
      required: [true, "Article category is required"],
      index: true,
    },
    relatedVideos: {
      type: [{ type: Schema.Types.ObjectId, ref: "Video" }],
      default: [],
    },
    relatedProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published", "unpublished"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    readTimeMinutes: {
      type: Number,
      min: 1,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Full-text search index
articleSchema.index({ title: "text", excerpt: "text", description: "text", technicalExplanation: "text" });
articleSchema.index({ status: 1, publishedAt: -1 });

// Auto-generate slug from title
articleSchema.pre("save", async function () {
  if (this.isModified("title")) {
    this.slug = (this.title as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const Article = mongoose.model<IArticle>("Article", articleSchema);

export default Article;
