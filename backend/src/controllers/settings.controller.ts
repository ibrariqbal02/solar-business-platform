import { Request, Response } from "express";
import WebsiteSettings from "../models/website-settings.model.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

// ─── PUBLIC: Safe settings (no secrets/IDs) ───────────────────────────────────
// GET /api/settings
export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await WebsiteSettings.findOne().select(
      "-googleAnalyticsId -facebookPixelId -logoPublicId -faviconPublicId -__v"
    );
    if (!settings) {
      res.status(200).json({ success: true, data: {} }); return;
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch settings", error: error.message });
  }
};

// ─── ADMIN: Full settings ─────────────────────────────────────────────────────
// GET /api/settings/admin
export const getAdminSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await WebsiteSettings.findOne();
    if (!settings) {
      res.status(200).json({ success: true, data: {} }); return;
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch settings", error: error.message });
  }
};

// ─── ADMIN: Update (upsert singleton) ────────────────────────────────────────
// PUT /api/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      businessName, tagline, whatsappNumber, phone, email, address, city, country,
      youtubeChannelUrl, socialLinks, businessHours, serviceAreas, currency,
      metaTitle, metaDescription, metaKeywords, googleAnalyticsId, facebookPixelId,
      maintenanceMode, removeLogo, removeFavicon,
    } = req.body;

    // Find or create the singleton
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = new WebsiteSettings({ businessName: businessName ?? "Solar Business" });
    }

    // Scalar fields
    const scalarMap: Record<string, unknown> = {
      businessName, tagline, whatsappNumber, phone, email, address, city, country,
      youtubeChannelUrl, currency, metaTitle, metaDescription,
      googleAnalyticsId, facebookPixelId,
    };
    for (const [key, val] of Object.entries(scalarMap)) {
      if (val !== undefined) (settings as any)[key] = typeof val === "string" ? val.trim() : val;
    }
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode === true || maintenanceMode === "true";
    if (socialLinks  !== undefined && typeof socialLinks  === "object") settings.socialLinks  = { ...settings.socialLinks,  ...socialLinks };
    if (businessHours !== undefined && typeof businessHours === "object") settings.businessHours = { ...settings.businessHours, ...businessHours };
    if (Array.isArray(serviceAreas))  settings.serviceAreas  = serviceAreas;
    if (Array.isArray(metaKeywords))  settings.metaKeywords  = metaKeywords;

    // Logo upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const logoFile    = files?.["logo"]?.[0];
    const faviconFile = files?.["favicon"]?.[0];

    if (logoFile) {
      if (settings.logoPublicId) await deleteFromCloudinary(settings.logoPublicId, "image");
      const u = await uploadToCloudinary(logoFile.buffer, "solar-platform/branding");
      settings.logo = u.secure_url; settings.logoPublicId = u.public_id;
    } else if (removeLogo === "true" && settings.logoPublicId) {
      await deleteFromCloudinary(settings.logoPublicId, "image");
      settings.logo = undefined; settings.logoPublicId = undefined;
    }

    if (faviconFile) {
      if (settings.faviconPublicId) await deleteFromCloudinary(settings.faviconPublicId, "image");
      const u = await uploadToCloudinary(faviconFile.buffer, "solar-platform/branding");
      settings.favicon = u.secure_url; settings.faviconPublicId = u.public_id;
    } else if (removeFavicon === "true" && settings.faviconPublicId) {
      await deleteFromCloudinary(settings.faviconPublicId, "image");
      settings.favicon = undefined; settings.faviconPublicId = undefined;
    }

    await settings.save();
    res.status(200).json({ success: true, message: "Settings updated", data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update settings", error: error.message });
  }
};
