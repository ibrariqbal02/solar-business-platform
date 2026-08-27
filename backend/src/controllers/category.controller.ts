import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape special regex characters from user input to prevent ReDoS */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Return true when a string is a valid MongoDB ObjectId */
const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * POST /api/categories
 * Body (multipart/form-data):
 *   name        string  required
 *   description string  optional
 *   image       file    optional  (field name: "image")
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Category name is required" });
      return;
    }

    // Duplicate name check (case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    });
    if (existing) {
      res.status(409).json({ success: false, message: "A category with this name already exists" });
      return;
    }

    // Upload image to Cloudinary if provided
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/categories");
      imageUrl = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      image: imageUrl,
      imagePublicId,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Query params:
 *   active  "true" | "false"   filter by isActive (omit = all)
 *   search  string             partial match on name
 *   page    number             page number (default 1)
 *   limit   number             items per page (default 10, max 100)
 *   sort    "name" | "createdAt" | "updatedAt"  (default "createdAt")
 *   order   "asc" | "desc"    (default "desc")
 */
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.active === "true") filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    if (req.query.search) {
      filter.name = { $regex: escapeRegex(req.query.search as string), $options: "i" };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const allowedSortFields = ["name", "createdAt", "updatedAt"];
    const sortField = allowedSortFields.includes(req.query.sort as string)
      ? (req.query.sort as string)
      : "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const [categories, total] = await Promise.all([
      Category.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      Category.countDocuments(filter),
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────

/**
 * GET /api/categories/:identifier
 * :identifier can be a MongoDB ObjectId OR a slug string
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const identifierStr = identifier as string;

    const category = isValidObjectId(identifierStr)
      ? await Category.findById(identifierStr)
      : await Category.findOne({ slug: identifierStr });

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * PUT /api/categories/:id
 * Body (multipart/form-data):
 *   name        string   optional
 *   description string   optional
 *   isActive    boolean  optional
 *   image       file     optional  (field name: "image") — replaces existing image
 *   removeImage "true"   optional  — explicitly remove image without uploading a new one
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = id as string;

    if (!isValidObjectId(idStr)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const category = await Category.findById(idStr);
    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    const { name, description, isActive, removeImage } = req.body;

    // Name update — check for conflicts
    if (name && name.trim() !== category.name) {
      const conflict = await Category.findOne({
        _id: { $ne: idStr },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "A category with this name already exists" });
        return;
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive === "true" || isActive === true;

    // Handle image replacement
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if ((category as any).imagePublicId) {
        await deleteFromCloudinary((category as any).imagePublicId, "image");
      }
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/categories");
      category.image = uploaded.secure_url;
      (category as any).imagePublicId = uploaded.public_id;
    } else if (removeImage === "true") {
      if ((category as any).imagePublicId) {
        await deleteFromCloudinary((category as any).imagePublicId, "image");
      }
      category.image = undefined;
      (category as any).imagePublicId = undefined;
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// ─── DEACTIVATE (soft delete) ─────────────────────────────────────────────────

/**
 * DELETE /api/categories/:id
 * Soft-deletes the category by setting isActive = false.
 * The record is preserved in the database.
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = id as string;

    if (!isValidObjectId(idStr)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const category = await Category.findById(idStr);
    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    if (!category.isActive) {
      res.status(400).json({ success: false, message: "Category is already deactivated" });
      return;
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to deactivate category",
      error: error.message,
    });
  }
};

// ─── RESTORE ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/categories/:id/restore
 * Re-activates a previously deactivated category.
 */
export const restoreCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = id as string;

    if (!isValidObjectId(idStr)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    const category = await Category.findById(idStr);
    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    if (category.isActive) {
      res.status(400).json({ success: false, message: "Category is already active" });
      return;
    }

    category.isActive = true;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category restored successfully",
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to restore category",
      error: error.message,
    });
  }
};
