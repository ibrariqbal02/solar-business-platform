import { Request, Response } from "express";
import mongoose from "mongoose";
import VideoCategory from "../models/video-category.model.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidId   = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ─── 1. CREATE VIDEO CATEGORY ─────────────────────────────────────────────────

/**
 * POST /api/video-categories
 * Body (JSON): { name*, description? }
 * Slug is auto-generated from name.
 */
export const createVideoCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Video category name is required" });
      return;
    }

    // Duplicate name check
    const exists = await VideoCategory.findOne({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    });
    if (exists) {
      res.status(409).json({ success: false, message: "A video category with this name already exists" });
      return;
    }

    const category = await VideoCategory.create({
      name: name.trim(),
      description: description?.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Video category created successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create video category", error: error.message });
  }
};

// ─── 2. GET ALL VIDEO CATEGORIES ──────────────────────────────────────────────

/**
 * GET /api/video-categories
 * Query params:
 *   active  "true"|"false"  filter by isActive (omit = all)
 *   search  string          partial name match
 *   page    number          default 1
 *   limit   number          default 10, max 100
 *   sort    "newest"|"oldest"|"name"  default "newest"
 */
export const getVideoCategories = async (req: Request, res: Response): Promise<void> => {
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
      VideoCategory.find(filter).sort(sortQuery).skip(skip).limit(limit),
      VideoCategory.countDocuments(filter),
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
    res.status(500).json({ success: false, message: "Failed to fetch video categories", error: error.message });
  }
};

// ─── 3. GET VIDEO CATEGORY BY ID ──────────────────────────────────────────────

/**
 * GET /api/video-categories/id/:id
 */
export const getVideoCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video category ID" });
      return;
    }

    const category = await VideoCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch video category", error: error.message });
  }
};

// ─── 4. GET VIDEO CATEGORY BY SLUG ────────────────────────────────────────────

/**
 * GET /api/video-categories/slug/:slug
 */
export const getVideoCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const category = await VideoCategory.findOne({ slug });
    if (!category) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch video category", error: error.message });
  }
};

// ─── 5. UPDATE VIDEO CATEGORY ─────────────────────────────────────────────────

/**
 * PUT /api/video-categories/:id
 * Body (JSON): { name?, description?, isActive? }
 * Slug auto-regenerates whenever name changes.
 */
export const updateVideoCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video category ID" });
      return;
    }

    const category = await VideoCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }

    const { name, description, isActive } = req.body;

    // Name uniqueness check
    if (name && name.trim() !== category.name) {
      const conflict = await VideoCategory.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "A video category with this name already exists" });
        return;
      }
      category.name = name.trim(); // pre-save hook will regenerate slug
    }

    if (description !== undefined) category.description = description.trim();
    if (isActive    !== undefined) category.isActive    = isActive === true || isActive === "true";

    await category.save();

    res.status(200).json({
      success: true,
      message: "Video category updated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update video category", error: error.message });
  }
};

// ─── 6. DELETE / DEACTIVATE VIDEO CATEGORY ────────────────────────────────────

/**
 * DELETE /api/video-categories/:id
 * Soft delete — sets isActive = false.
 */
export const deleteVideoCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video category ID" });
      return;
    }

    const category = await VideoCategory.findById(id);
    if (!category) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }
    if (!category.isActive) {
      res.status(400).json({ success: false, message: "Video category is already deactivated" });
      return;
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Video category deactivated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to deactivate video category", error: error.message });
  }
};

// ─── 7. TOGGLE VIDEO CATEGORY STATUS ─────────────────────────────────────────

/**
 * PATCH /api/video-categories/:id/status
 * Body (JSON): { isActive: true | false }
 */
export const toggleVideoCategoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video category ID" });
      return;
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      res.status(400).json({ success: false, message: "isActive field is required" });
      return;
    }

    const category = await VideoCategory.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === "true" },
      { returnDocument: "after", select: "_id name slug isActive" }
    );

    if (!category) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Video category ${category.isActive ? "activated" : "deactivated"} successfully`,
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle video category status", error: error.message });
  }
};
