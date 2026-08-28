import { Request, Response } from "express";
import mongoose from "mongoose";
import ArticleCategory from "../models/article-category.model";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidId   = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ─── 1. CREATE ARTICLE CATEGORY ───────────────────────────────────────────────

/**
 * POST /api/article-categories
 * Body (JSON): { name*, description? }
 * Slug is auto-generated from name.
 */
export const createArticleCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Article category name is required" });
      return;
    }

    // Duplicate name check
    const exists = await ArticleCategory.findOne({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    });
    if (exists) {
      res.status(409).json({ success: false, message: "An article category with this name already exists" });
      return;
    }

    const category = await ArticleCategory.create({
      name: name.trim(),
      description: description?.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Article category created successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create article category", error: error.message });
  }
};

// ─── 2. GET ALL ARTICLE CATEGORIES ───────────────────────────────────────────

/**
 * GET /api/article-categories
 * Query params:
 *   active  "true"|"false"          — filter by isActive (omit = all)
 *   search  string                  — partial name match
 *   page    number (default 1)
 *   limit   number (default 10, max 100)
 *   sort    "newest"|"oldest"|"name" (default "newest")
 */
export const getArticleCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.active === "true")  filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    if (req.query.search) {
      filter.name = { $regex: escapeRegex(req.query.search as string), $options: "i" };
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt:  1 },
      name:   { name:       1 },
    };
    const sortQuery = sortMap[(req.query.sort as string)] ?? sortMap.newest;

    const [categories, total] = await Promise.all([
      ArticleCategory.find(filter).sort(sortQuery).skip(skip).limit(limit),
      ArticleCategory.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch article categories", error: error.message });
  }
};

// ─── 3. GET ARTICLE CATEGORY BY ID ───────────────────────────────────────────

/**
 * GET /api/article-categories/id/:id
 */
export const getArticleCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article category ID" });
      return;
    }

    const category = await ArticleCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch article category", error: error.message });
  }
};

// ─── 4. GET ARTICLE CATEGORY BY SLUG ─────────────────────────────────────────

/**
 * GET /api/article-categories/slug/:slug
 */
export const getArticleCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const category = await ArticleCategory.findOne({ slug });
    if (!category) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch article category", error: error.message });
  }
};

// ─── 5. UPDATE ARTICLE CATEGORY ──────────────────────────────────────────────

/**
 * PUT /api/article-categories/:id
 * Body (JSON): { name?, description?, isActive? }
 * Slug auto-regenerates whenever name changes.
 */
export const updateArticleCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article category ID" });
      return;
    }

    const category = await ArticleCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }

    const { name, description, isActive } = req.body;

    // Name uniqueness check
    if (name && name.trim() !== category.name) {
      const conflict = await ArticleCategory.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "An article category with this name already exists" });
        return;
      }
      category.name = name.trim(); // pre-save hook regenerates slug
    }

    if (description !== undefined) category.description = description.trim();
    if (isActive    !== undefined) category.isActive    = isActive === true || isActive === "true";

    await category.save();

    res.status(200).json({
      success: true,
      message: "Article category updated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update article category", error: error.message });
  }
};

// ─── 6. DELETE / DEACTIVATE ARTICLE CATEGORY ─────────────────────────────────

/**
 * DELETE /api/article-categories/:id
 * Soft delete — sets isActive = false.
 */
export const deleteArticleCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article category ID" });
      return;
    }

    const category = await ArticleCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }
    if (!category.isActive) {
      res.status(400).json({ success: false, message: "Article category is already deactivated" });
      return;
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Article category deactivated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to deactivate article category", error: error.message });
  }
};

// ─── 7. TOGGLE ARTICLE CATEGORY STATUS ───────────────────────────────────────

/**
 * PATCH /api/article-categories/:id/status
 * Body (JSON): { isActive: true | false }
 */
export const toggleArticleCategoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article category ID" });
      return;
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      res.status(400).json({ success: false, message: "isActive field is required" });
      return;
    }

    const category = await ArticleCategory.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === "true" },
      { new: true, select: "_id name slug isActive" }
    );
    if (!category) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Article category ${category.isActive ? "activated" : "deactivated"} successfully`,
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle article category status", error: error.message });
  }
};
