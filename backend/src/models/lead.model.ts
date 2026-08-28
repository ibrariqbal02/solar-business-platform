import mongoose, { Document, Schema } from "mongoose";

/**
 * Unified lead/enquiry model.
 * Each lead stores a `type` discriminator and a flexible `data` sub-document
 * so the admin can view all enquiries in one place.
 */
export type LeadType =
  | "product_enquiry"
  | "technical_support"
  | "video_call"
  | "site_visit"
  | "installation"
  | "contact";

export type LeadStatus =
  | "new"
  | "contacted"
  | "in_progress"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface ILead extends Document {
  type: LeadType;
  status: LeadStatus;
  // Common customer fields
  customerName: string;
  customerPhone: string;
  customerWhatsApp?: string;
  customerEmail?: string;
  // Flexible payload stored per-type
  data: Record<string, unknown>;
  adminNote?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    type: {
      type: String,
      enum: ["product_enquiry", "technical_support", "video_call", "site_visit", "installation", "contact"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "in_progress", "scheduled", "completed", "cancelled"],
      default: "new",
      index: true,
    },
    customerName:      { type: String, required: [true, "Customer name is required"], trim: true, maxlength: [100, "Name cannot exceed 100 characters"] },
    customerPhone:     { type: String, required: [true, "Phone number is required"], trim: true },
    customerWhatsApp:  { type: String, trim: true },
    customerEmail:     { type: String, trim: true, lowercase: true },
    data:              { type: Schema.Types.Mixed, default: {} },
    adminNote:         { type: String, trim: true },
    assignedTo:        { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ type: 1, status: 1, createdAt: -1 });

const Lead = mongoose.model<ILead>("Lead", leadSchema);
export default Lead;
