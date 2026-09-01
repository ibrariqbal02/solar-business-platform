// Matches backend/src/models/website-settings.model.ts exactly.
// Public GET /api/settings strips: googleAnalyticsId, facebookPixelId,
// logoPublicId, faviconPublicId, __v — so those are absent here.

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

export interface WebsiteSettings {
  _id: string;
  // Business identity
  businessName: string;
  tagline?: string;
  logo?: string;
  favicon?: string;
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
  currency: string; // default "PKR"
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  // State
  maintenanceMode: boolean;
  updatedAt: string;
}
