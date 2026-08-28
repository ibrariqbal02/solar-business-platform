import mongoose, { Document, Schema } from "mongoose";

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface ITestimonial extends Document {
  customerName: string;
  customerImage?: string;
  customerImagePublicId?: string;
  customerLocation?: string;
  review: string;
  rating: number;                              // 1–5
  relatedProduct?: mongoose.Types.ObjectId;
  relatedService?: string;                     // free-text service name
  isVisible: boolean;
  status: TestimonialStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    customerImage:          { type: String, trim: true },
    customerImagePublicId:  { type: String, trim: true },
    customerLocation:       { type: String, trim: true, maxlength: [100, "Location cannot exceed 100 characters"] },
    review: {
      type: String,
      required: [true, "Review is required"],
      trim: true,
      maxlength: [2000, "Review cannot exceed 2000 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    relatedProduct: { type: Schema.Types.ObjectId, ref: "Product" },
    relatedService: { type: String, trim: true },
    isVisible:  { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, trim: true },
  },
  { timestamps: true }
);

testimonialSchema.index({ status: 1, isVisible: 1, createdAt: -1 });

const Testimonial = mongoose.model<ITestimonial>("Testimonial", testimonialSchema);
export default Testimonial;
