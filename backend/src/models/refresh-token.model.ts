import mongoose, { Document, Schema } from "mongoose";

export interface IRefreshToken extends Document {
  adminId: mongoose.Types.ObjectId;
  tokenHash: string;               // SHA-256 hash of the raw refresh token
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;        // hash of the successor token (rotation chain)
  userAgent?: string;              // optional device/session metadata
  ipAddress?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
    },
    replacedByToken: {
      type: String,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index — MongoDB auto-purges expired tokens after they expire
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);

export default RefreshToken;
