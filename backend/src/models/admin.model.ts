import mongoose, { Document, Schema } from "mongoose";

export type AdminRole = "super_admin" | "admin" | "editor";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordResetToken?: string;      // SHA-256 hash of the raw token
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,   // never returned by default
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "editor"],
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,   // never returned by default
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

const Admin = mongoose.model<IAdmin>("Admin", adminSchema);

export default Admin;
