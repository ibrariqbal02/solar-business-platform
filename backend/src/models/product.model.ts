import mongoose, { Document, Schema } from "mongoose";

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IProductImage {
  url: string;
  publicId: string;
  altText?: string;
  isPrimary: boolean;
}

export interface ISpecification {
  label: string;
  value: string;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IProduct extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  detailedDescription?: string;
  category: mongoose.Types.ObjectId;
  price: number;
  discountedPrice?: number;
  unit: string;                        // e.g. "piece", "kW", "set"
  images: IProductImage[];
  specifications: ISpecification[];
  features: string[];
  applications: string[];              // e.g. ["residential", "commercial"]
  stock: number;
  stockStatus: StockStatus;
  isAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  viewCount: number;
  enquiryCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    altText: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const specificationSchema = new Schema<ISpecification>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
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
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    detailedDescription: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      min: [0, "Discounted price cannot be negative"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      default: "piece",
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    applications: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    stockStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "out_of_stock",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    enquiryCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

productSchema.index({ name: "text", shortDescription: "text", detailedDescription: "text" });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, isAvailable: 1 });

// ─── Slug auto-generation ─────────────────────────────────────────────────────

productSchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slug = (this.name as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Auto-derive stockStatus from stock quantity
  if (this.isModified("stock")) {
    if (this.stock <= 0) this.stockStatus = "out_of_stock";
    else if (this.stock <= 5) this.stockStatus = "low_stock";
    else this.stockStatus = "in_stock";
  }
});

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
