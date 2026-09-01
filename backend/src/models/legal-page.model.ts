import mongoose, { Document, Schema } from "mongoose";

export type LegalPageType = "privacy_policy" | "terms_of_service";

export interface ILegalPage extends Document {
  type: LegalPageType;
  title: string;
  content: string;   // Rich HTML — sanitized before write
  createdAt: Date;
  updatedAt: Date;
}

const legalPageSchema = new Schema<ILegalPage>(
  {
    type: {
      type: String,
      enum: ["privacy_policy", "terms_of_service"],
      required: true,
      unique: true,   // one document per type
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const LegalPage = mongoose.model<ILegalPage>("LegalPage", legalPageSchema);
export default LegalPage;
