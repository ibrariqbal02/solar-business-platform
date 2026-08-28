import mongoose, { Document, Schema } from "mongoose";

export interface IServiceCTA {
  label: string;   // e.g. "Get a Free Quote"
  url?: string;    // external link (optional if using WhatsApp/modal)
  type: "link" | "whatsapp" | "modal";
}

export interface IService extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  areas: string[];          // service coverage areas e.g. ["Lahore", "Karachi"]
  features: string[];       // key bullet points
  cta: IServiceCTA;
  order: number;            // display order on frontend
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCtaSchema = new Schema<IServiceCTA>(
  {
    label: { type: String, required: true, trim: true, default: "Enquire Now" },
    url:   { type: String, trim: true },
    type:  { type: String, enum: ["link", "whatsapp", "modal"], default: "whatsapp" },
  },
  { _id: false }
);

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      unique: true,
      maxlength: [150, "Service name cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    areas: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    cta: {
      type: serviceCtaSchema,
      default: () => ({ label: "Enquire Now", type: "whatsapp" }),
    },
    order: {
      type: Number,
      default: 0,
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

// Auto-generate slug from name
serviceSchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slug = (this.name as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const Service = mongoose.model<IService>("Service", serviceSchema);

export default Service;
