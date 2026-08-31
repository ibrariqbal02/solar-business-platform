import mongoose, { Document, Schema } from "mongoose";

export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
}

export interface IBusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface IWebsiteSettings extends Document {
  /** Internal singleton lock — never exposed via API */
  _singleton?: string;
  // Business identity
  businessName: string;
  tagline?: string;
  logo?: string;
  logoPublicId?: string;
  favicon?: string;
  faviconPublicId?: string;
  // Contact
  whatsappNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  // Social / digital
  youtubeChannelUrl?: string;
  socialLinks: ISocialLinks;
  // Operations
  businessHours: IBusinessHours;
  serviceAreas: string[];
  currency: string;
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  // Analytics
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  // State
  maintenanceMode: boolean;
  updatedAt: Date;
}

const websiteSettingsSchema = new Schema<IWebsiteSettings>(
  {
    // Singleton lock — ensures only one document can ever exist
    _singleton: { type: String, default: "global", unique: true, select: false },
    businessName: { type: String, required: true, trim: true, default: "Solar Business" },
    tagline:      { type: String, trim: true },
    logo:         { type: String, trim: true },
    logoPublicId: { type: String, trim: true },
    favicon:      { type: String, trim: true },
    faviconPublicId: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    phone:          { type: String, trim: true },
    email:          { type: String, trim: true, lowercase: true },
    address:        { type: String, trim: true },
    city:           { type: String, trim: true },
    country:        { type: String, trim: true, default: "Pakistan" },
    youtubeChannelUrl: { type: String, trim: true },
    socialLinks: {
      facebook:  { type: String, trim: true },
      instagram: { type: String, trim: true },
      youtube:   { type: String, trim: true },
      twitter:   { type: String, trim: true },
      linkedin:  { type: String, trim: true },
      tiktok:    { type: String, trim: true },
    },
    businessHours: {
      monday:    { type: String, trim: true },
      tuesday:   { type: String, trim: true },
      wednesday: { type: String, trim: true },
      thursday:  { type: String, trim: true },
      friday:    { type: String, trim: true },
      saturday:  { type: String, trim: true },
      sunday:    { type: String, trim: true },
    },
    serviceAreas:    { type: [String], default: [] },
    currency:        { type: String, default: "PKR" },
    metaTitle:       { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords:    { type: [String], default: [] },
    googleAnalyticsId: { type: String, trim: true },
    facebookPixelId:   { type: String, trim: true },
    maintenanceMode:   { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const WebsiteSettings = mongoose.model<IWebsiteSettings>("WebsiteSettings", websiteSettingsSchema);
export default WebsiteSettings;
