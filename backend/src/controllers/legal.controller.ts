import { Request, Response } from "express";
import LegalPage, { LegalPageType } from "../models/legal-page.model.js";
import { sanitizeRichText } from "../utils/sanitizeHtml.js";

const VALID_TYPES: LegalPageType[] = ["privacy_policy", "terms_of_service"];

const DEFAULT_CONTENT: Record<LegalPageType, { title: string; content: string }> = {
  privacy_policy: {
    title: "Privacy Policy",
    content: "<p>This Privacy Policy explains how we collect, use, and protect your personal information. Please update this content from the admin dashboard.</p>",
  },
  terms_of_service: {
    title: "Terms of Service",
    content: "<p>These Terms of Service govern your use of our platform. Please update this content from the admin dashboard.</p>",
  },
};

/**
 * GET /api/legal/:type
 * Public — returns the legal page, seeding a default if none exists yet.
 */
export const getLegalPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as LegalPageType;

    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(", ")}`,
      });
      return;
    }

    // Upsert default placeholder so the route always returns valid content
    let page = await LegalPage.findOne({ type });
    if (!page) {
      const defaults = DEFAULT_CONTENT[type];
      page = await LegalPage.create({ type, ...defaults });
    }

    res.status(200).json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch legal page", error: error.message });
  }
};

/**
 * PUT /api/legal/:type
 * Protected (admin) — update title and/or content for the given type.
 * Content is HTML-sanitized before saving.
 */
export const updateLegalPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as LegalPageType;

    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(", ")}`,
      });
      return;
    }

    const { title, content } = req.body;

    if (title !== undefined && !title?.trim()) {
      res.status(400).json({ success: false, message: "title cannot be empty" });
      return;
    }

    const defaults = DEFAULT_CONTENT[type];
    const update: Partial<{ title: string; content: string }> = {};
    if (title   !== undefined) update.title   = title.trim();
    if (content !== undefined) update.content = sanitizeRichText(content);

    const page = await LegalPage.findOneAndUpdate(
      { type },
      { $set: update },
      {
        new: true,
        upsert: true,
        // On insert (first PUT before any GET), use the default title
        setDefaultsOnInsert: true,
      }
    );

    // If upsert created a new doc with no title set, backfill the default
    if (page && !page.title) {
      page.title = defaults.title;
      await page.save();
    }

    res.status(200).json({ success: true, message: "Legal page updated", data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update legal page", error: error.message });
  }
};
