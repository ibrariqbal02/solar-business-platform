import { Request, Response } from "express";
import mongoose from "mongoose";
import FAQ from "../models/faq.model.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_CATEGORIES = [
  "general", "products", "installation", "delivery",
  "technical_support", "pricing", "warranty", "other",
];

// ─── 1. CREATE FAQ ────────────────────────────────────────────────────────────

/**
 * POST /api/faqs
 * Body (JSON):
 *   question*   string
 *   answer*     string
 *   category    FAQCategory  (default "general")
 *   order       number       (default 0)
 *   isActive    boolean      (default true)
 */
export const createFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, answer, category, order, isActive } = req.body;

    if (!question?.trim()) {
      res.status(400).json({ success: false, message: "Question is required" });
      return;
    }
    if (!answer?.trim()) {
      res.status(400).json({ success: false, message: "Answer is required" });
      return;
    }
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({
        success: false,
        message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
      });
      return;
    }
    if (order !== undefined && (isNaN(Number(order)) || Number(order) < 0)) {
      res.status(400).json({ success: false, message: "order must be a non-negative number" });
      return;
    }

    const faq = await FAQ.create({
      question: question.trim(),
      answer:   answer.trim(),
      category: category || "general",
      order:    order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive === true || isActive === "true" : true,
    });

    res.status(201).json({ success: true, message: "FAQ created successfully", data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create FAQ", error: error.message });
  }
};

// ─── 2. GET FAQs (paginated, filtered, searched) ──────────────────────────────

/**
 * GET /api/faqs
 * Query params:
 *   search    string           — keyword search in question + answer
 *   category  FAQCategory      — filter by category
 *   active    "true"|"false"   — filter by isActive (omit = all)
 *   page      number (default 1)
 *   limit     number (default 20, max 100)
 */
export const getFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    if (req.query.category) {
      if (!ALLOWED_CATEGORIES.includes(req.query.category as string)) {
        res.status(400).json({
          success: false,
          message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
        });
        return;
      }
      filter.category = req.query.category;
    }

    if (req.query.active === "true")  filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [faqs, total] = await Promise.all([
      FAQ.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit),
      FAQ.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: faqs,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch FAQs", error: error.message });
  }
};

// ─── 3. GET ACTIVE FAQs (public) ──────────────────────────────────────────────

/**
 * GET /api/faqs/active
 * Returns only isActive = true FAQs, ordered by category then order.
 * Supports optional ?category filter.
 */
export const getActiveFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { isActive: true };

    if (req.query.category) {
      if (!ALLOWED_CATEGORIES.includes(req.query.category as string)) {
        res.status(400).json({
          success: false,
          message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
        });
        return;
      }
      filter.category = req.query.category;
    }

    const faqs = await FAQ.find(filter).sort({ category: 1, order: 1 });

    res.status(200).json({ success: true, count: faqs.length, data: faqs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch FAQs", error: error.message });
  }
};

// ─── 4. GET FAQ BY ID ─────────────────────────────────────────────────────────

/**
 * GET /api/faqs/:id
 */
export const getFAQById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid FAQ ID" });
      return;
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      res.status(404).json({ success: false, message: "FAQ not found" });
      return;
    }

    res.status(200).json({ success: true, data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch FAQ", error: error.message });
  }
};

// ─── 5. UPDATE FAQ ────────────────────────────────────────────────────────────

/**
 * PUT /api/faqs/:id
 * Body (JSON): { question?, answer?, category?, order?, isActive? }
 */
export const updateFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid FAQ ID" });
      return;
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      res.status(404).json({ success: false, message: "FAQ not found" });
      return;
    }

    const { question, answer, category, order, isActive } = req.body;

    if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({
        success: false,
        message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
      });
      return;
    }
    if (order !== undefined && (isNaN(Number(order)) || Number(order) < 0)) {
      res.status(400).json({ success: false, message: "order must be a non-negative number" });
      return;
    }

    if (question  !== undefined) faq.question  = question.trim();
    if (answer    !== undefined) faq.answer    = answer.trim();
    if (category  !== undefined) faq.category  = category;
    if (order     !== undefined) faq.order     = Number(order);
    if (isActive  !== undefined) faq.isActive  = isActive === true || isActive === "true";

    await faq.save();

    res.status(200).json({ success: true, message: "FAQ updated successfully", data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update FAQ", error: error.message });
  }
};

// ─── 6. DELETE / DEACTIVATE FAQ ───────────────────────────────────────────────

/**
 * DELETE /api/faqs/:id
 * Soft delete — sets isActive = false.
 */
export const deleteFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid FAQ ID" });
      return;
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      res.status(404).json({ success: false, message: "FAQ not found" });
      return;
    }
    if (!faq.isActive) {
      res.status(400).json({ success: false, message: "FAQ is already deactivated" });
      return;
    }

    faq.isActive = false;
    await faq.save();

    res.status(200).json({ success: true, message: "FAQ deactivated successfully", data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to deactivate FAQ", error: error.message });
  }
};

// ─── 7. TOGGLE FAQ STATUS ─────────────────────────────────────────────────────

/**
 * PATCH /api/faqs/:id/status
 * Body (JSON): { isActive: true | false }
 */
export const toggleFAQStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid FAQ ID" });
      return;
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      res.status(400).json({ success: false, message: "isActive field is required" });
      return;
    }

    const faq = await FAQ.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === "true" },
      { new: true, select: "_id question isActive" }
    );
    if (!faq) {
      res.status(404).json({ success: false, message: "FAQ not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
      data: faq,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle FAQ status", error: error.message });
  }
};

// ─── 8. REORDER FAQs ─────────────────────────────────────────────────────────

/**
 * PATCH /api/faqs/reorder
 * Body (JSON): { items: [{ id: string, order: number }] }
 * Updates the order field for multiple FAQs in a single request.
 */
export const reorderFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items?: { id: string; order: number }[] };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "items must be a non-empty array of { id, order }" });
      return;
    }

    // Validate every entry before touching the DB
    for (const item of items) {
      if (!item.id || !isValidId(item.id)) {
        res.status(400).json({ success: false, message: `Invalid FAQ ID: ${item.id}` });
        return;
      }
      if (item.order === undefined || isNaN(Number(item.order)) || Number(item.order) < 0) {
        res.status(400).json({ success: false, message: `Invalid order value for FAQ: ${item.id}` });
        return;
      }
    }

    // Bulk write — one DB round-trip
    const bulkOps = items.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { order: Number(order) } },
      },
    }));

    const result = await FAQ.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} FAQ(s) reordered successfully`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to reorder FAQs", error: error.message });
  }
};
