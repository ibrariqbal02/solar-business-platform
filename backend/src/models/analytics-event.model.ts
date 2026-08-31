import mongoose, { Document, Schema } from "mongoose";

export type EventType =
  | "product_view"
  | "product_enquiry"
  | "page_view"
  | "search"
  | "whatsapp_click"
  | "technical_support_click"
  | "video_call_request"
  | "site_visit_request"
  | "installation_request"
  | "contact_form_submitted"
  | "youtube_video_clicked";

export interface IAnalyticsEvent extends Document {
  eventType: EventType;
  product?: mongoose.Types.ObjectId;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "product_view", "product_enquiry", "page_view", "search",
        "whatsapp_click", "technical_support_click", "video_call_request",
        "site_visit_request", "installation_request", "contact_form_submitted",
        "youtube_video_clicked",
      ],
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    referrer: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index — auto-delete analytics events older than 90 days
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const AnalyticsEvent = mongoose.model<IAnalyticsEvent>("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
