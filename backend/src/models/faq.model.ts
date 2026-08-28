import mongoose, { Document, Schema } from "mongoose";

export type FAQCategory =
  | "general"
  | "products"
  | "installation"
  | "delivery"
  | "technical_support"
  | "pricing"
  | "warranty"
  | "other";

export interface IFAQ extends Document {
  question: string;
  answer: string;
  category: FAQCategory;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["general", "products", "installation", "delivery", "technical_support", "pricing", "warranty", "other"],
      default: "general",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Order must be a non-negative number"],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Text index for search across question and answer
faqSchema.index({ question: "text", answer: "text" });
faqSchema.index({ isActive: 1, category: 1, order: 1 });

const FAQ = mongoose.model<IFAQ>("FAQ", faqSchema);

export default FAQ;
