import mongoose, { Document, Schema } from "mongoose";

export type EnquiryStatus = "pending" | "contacted" | "resolved" | "closed";
export type EnquiryChannel = "whatsapp" | "call" | "email" | "form";

export interface IProductEnquiry extends Document {
  product: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  quantity?: number;
  channel: EnquiryChannel;
  status: EnquiryStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productEnquirySchema = new Schema<IProductEnquiry>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    quantity: {
      type: Number,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    channel: {
      type: String,
      enum: ["whatsapp", "call", "email", "form"],
      default: "whatsapp",
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "resolved", "closed"],
      default: "pending",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const ProductEnquiry = mongoose.model<IProductEnquiry>("ProductEnquiry", productEnquirySchema);

export default ProductEnquiry;
