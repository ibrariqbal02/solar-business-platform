import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "product_enquiry"
  | "technical_support"
  | "video_call"
  | "site_visit"
  | "installation"
  | "contact"
  | "system";

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  relatedLead?: mongoose.Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title:   { type: String, required: true, trim: true, maxlength: [200, "Title cannot exceed 200 characters"] },
    message: { type: String, required: true, trim: true, maxlength: [1000, "Message cannot exceed 1000 characters"] },
    type: {
      type: String,
      enum: ["product_enquiry", "technical_support", "video_call", "site_visit", "installation", "contact", "system"],
      required: true,
      index: true,
    },
    relatedLead: { type: Schema.Types.ObjectId, ref: "Lead" },
    isRead:  { type: Boolean, default: false, index: true },
    readAt:  { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ isRead: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
