import { Request, Response } from "express";
import mongoose from "mongoose";
import Article from "../models/article.model";
import ArticleCategory from "../models/article-category.model";
import Video from "../models/video.model";
import Product from "../models/product.model";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidId   = (id: string) => mongoose.Types.ObjectId.isValid(id);

const parseIdArray = (value: unknown): mongoose.Types.ObjectId[] => {
  const raw: string[] = Array.isArray(value)
    ? (value as string[])
    : typeof value === "string"
    ? (() => { try { return JSON.parse(value); } catch { return []; } })()
    : [];
  return raw.filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
};

const parseStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
};

/**
 * Rough read-time estimate: avg 200 words/min.
 * Counts words in all text fields combined.
 */
const estimateReadTime = (fields: (string | undefined)[]): number => {
  const total = fields
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(total / 200));
};

// ─── 1. CREATE ARTICLE ────────────────────────────────────────────────────────

/**
 * POST /api/articles
 * Content-Type: multipart/form-data
 * Fields:
 *   title*                string
 *   category*             ObjectId
 *   excerpt               string
 *   description           string
 *   technicalExplanation  string
 *   troubleshootingSteps  JSON array of strings
 *   safetyInformation     string
 *   relatedVideos         JSON array of ObjectIds
 *   relatedProducts       JSON array of ObjectIds
 *   tags                  JSON array of strings
 *   status                "draft"|"published"|"unpublished"  (default "draft")
 *   publishedAt           ISO date string (auto-set when status = "published")
 * File:
 *   featuredImage         single image (field name "featuredImage")
 */
export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title, category, excerpt, description,
      technicalExplanation, safetyInformation, status, publishedAt,
    } = req.body;

    // ── Required fields ──
    if (!title?.trim()) {
      res.status(400).json({ success: false, message: "Article title is required" });
      return;
    }
    if (!category) {
      res.status(400).json({ success: false, message: "Category is required" });
      return;
    }
    if (!isValidId(category as string)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }

    // ── Duplicate title/slug check ──
    const duplicate = await Article.findOne({
      title: { $regex: `^${escapeRegex(title.trim())}$`, $options: "i" },
    });
    if (duplicate) {
      res.status(409).json({ success: false, message: "An article with this title already exists" });
      return;
    }

    // ── Category validation ──
    const cat = await ArticleCategory.findById(category);
    if (!cat) {
      res.status(404).json({ success: false, message: "Article category not found" });
      return;
    }
    if (!cat.isActive) {
      res.status(400).json({ success: false, message: "Selected article category is inactive" });
      return;
    }

    // ── Related videos validation ──
    const relatedVideoIds = parseIdArray(req.body.relatedVideos);
    if (relatedVideoIds.length > 0) {
      const foundVideos = await Video.countDocuments({ _id: { $in: relatedVideoIds } });
      if (foundVideos !== relatedVideoIds.length) {
        res.status(400).json({ success: false, message: "One or more related video IDs are invalid" });
        return;
      }
    }

    // ── Related products validation ──
    const relatedProductIds = parseIdArray(req.body.relatedProducts);
    if (relatedProductIds.length > 0) {
      const foundProducts = await Product.countDocuments({ _id: { $in: relatedProductIds } });
      if (foundProducts !== relatedProductIds.length) {
        res.status(400).json({ success: false, message: "One or more related product IDs are invalid" });
        return;
      }
    }

    // ── Status & publishedAt ──
    const allowedStatuses = ["draft", "published", "unpublished"];
    const articleStatus = allowedStatuses.includes(status) ? status : "draft";
    const articlePublishedAt =
      articleStatus === "published"
        ? publishedAt ? new Date(publishedAt) : new Date()
        : undefined;

    // ── Featured image upload ──
    let featuredImage: string | undefined;
    let featuredImagePublicId: string | undefined;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/articles");
      featuredImage         = uploaded.secure_url;
      featuredImagePublicId = uploaded.public_id;
    }

    const troubleshootingSteps = parseStringArray(req.body.troubleshootingSteps);
    const tags                 = parseStringArray(req.body.tags);

    const article = await Article.create({
      title:                title.trim(),
      excerpt:              excerpt?.trim(),
      description:          description?.trim(),
      technicalExplanation: technicalExplanation?.trim(),
      troubleshootingSteps,
      safetyInformation:    safetyInformation?.trim(),
      category,
      relatedVideos:        relatedVideoIds,
      relatedProducts:      relatedProductIds,
      tags,
      status:               articleStatus,
      publishedAt:          articlePublishedAt,
      featuredImage,
      featuredImagePublicId,
      readTimeMinutes: estimateReadTime([description, technicalExplanation, safetyInformation]),
    });

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: article,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create article", error: error.message });
  }
};

// ─── 2. GET ARTICLES ──────────────────────────────────────────────────────────

/**
 * GET /api/articles
 * Query params:
 *   search    string           — text search on title, excerpt, description, technicalExplanation
 *   category  ObjectId         — filter by article category
 *   status    "draft"|"published"|"unpublished"
 *   sort      "newest"|"oldest"|"published"  (default "newest")
 *   page      number (default 1)
 *   limit     number (default 10, max 100)
 */
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    if (req.query.category) {
      const catId = req.query.category as string;
      if (!isValidId(catId)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      filter.category = new mongoose.Types.ObjectId(catId);
    }

    if (req.query.status) {
      const allowed = ["draft", "published", "unpublished"];
      if (!allowed.includes(req.query.status as string)) {
        res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(", ")}` });
        return;
      }
      filter.status = req.query.status;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest:    { createdAt:   -1 },
      oldest:    { createdAt:    1 },
      published: { publishedAt: -1 },
    };
    const sortQuery = sortMap[(req.query.sort as string)] ?? sortMap.newest;

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate("category", "name slug")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        // Lean list — omit heavy content fields
        .select("-description -technicalExplanation -troubleshootingSteps -safetyInformation"),
      Article.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: articles,
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
    res.status(500).json({ success: false, message: "Failed to fetch articles", error: error.message });
  }
};

// ─── 3. GET ARTICLE BY ID ─────────────────────────────────────────────────────

/**
 * GET /api/articles/id/:id
 * Returns full article with populated category, relatedVideos, relatedProducts.
 */
export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id)
      .populate("category", "name slug")
      .populate("relatedVideos", "title youtubeVideoId thumbnail youtubeUrl")
      .populate("relatedProducts", "name slug images price unit");

    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }

    // Increment view count (non-blocking)
    Article.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

    res.status(200).json({ success: true, data: article });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch article", error: error.message });
  }
};

// ─── 4. GET ARTICLE BY SLUG ───────────────────────────────────────────────────

/**
 * GET /api/articles/slug/:slug
 */
export const getArticleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const article = await Article.findOne({ slug })
      .populate("category", "name slug")
      .populate("relatedVideos", "title youtubeVideoId thumbnail youtubeUrl")
      .populate("relatedProducts", "name slug images price unit");

    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }

    Article.findByIdAndUpdate(article._id, { $inc: { viewCount: 1 } }).exec();

    res.status(200).json({ success: true, data: article });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch article", error: error.message });
  }
};

// ─── 5. UPDATE ARTICLE ────────────────────────────────────────────────────────

/**
 * PUT /api/articles/:id
 * Content-Type: multipart/form-data
 * All fields optional. Pass removeFeaturedImage="true" to clear the current image.
 */
export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }

    const {
      title, category, excerpt, description,
      technicalExplanation, safetyInformation,
      status, publishedAt, removeFeaturedImage,
    } = req.body;

    // Title uniqueness check
    if (title && title.trim() !== article.title) {
      const conflict = await Article.findOne({
        _id: { $ne: id },
        title: { $regex: `^${escapeRegex(title.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "An article with this title already exists" });
        return;
      }
      article.title = title.trim(); // slug regenerates via pre-save hook
    }

    // Category validation
    if (category !== undefined) {
      if (!isValidId(category as string)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      const cat = await ArticleCategory.findById(category);
      if (!cat || !cat.isActive) {
        res.status(400).json({ success: false, message: "Article category not found or inactive" });
        return;
      }
      article.category = new mongoose.Types.ObjectId(category as string);
    }

    // Related videos validation
    if (req.body.relatedVideos !== undefined) {
      const ids = parseIdArray(req.body.relatedVideos);
      if (ids.length > 0) {
        const found = await Video.countDocuments({ _id: { $in: ids } });
        if (found !== ids.length) {
          res.status(400).json({ success: false, message: "One or more related video IDs are invalid" });
          return;
        }
      }
      article.relatedVideos = ids;
    }

    // Related products validation
    if (req.body.relatedProducts !== undefined) {
      const ids = parseIdArray(req.body.relatedProducts);
      if (ids.length > 0) {
        const found = await Product.countDocuments({ _id: { $in: ids } });
        if (found !== ids.length) {
          res.status(400).json({ success: false, message: "One or more related product IDs are invalid" });
          return;
        }
      }
      article.relatedProducts = ids;
    }

    if (excerpt              !== undefined) article.excerpt              = excerpt.trim();
    if (description          !== undefined) article.description          = description.trim();
    if (technicalExplanation !== undefined) article.technicalExplanation = technicalExplanation.trim();
    if (safetyInformation    !== undefined) article.safetyInformation    = safetyInformation.trim();

    if (req.body.troubleshootingSteps !== undefined)
      article.troubleshootingSteps = parseStringArray(req.body.troubleshootingSteps, article.troubleshootingSteps);
    if (req.body.tags !== undefined)
      article.tags = parseStringArray(req.body.tags, article.tags);

    // Status
    const allowedStatuses = ["draft", "published", "unpublished"];
    if (status !== undefined && allowedStatuses.includes(status)) {
      article.status = status;
      if (status === "published" && !article.publishedAt) {
        article.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
      }
    }

    // Featured image
    if (req.file) {
      if (article.featuredImagePublicId)
        await deleteFromCloudinary(article.featuredImagePublicId, "image");
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/articles");
      article.featuredImage         = uploaded.secure_url;
      article.featuredImagePublicId = uploaded.public_id;
    } else if (removeFeaturedImage === "true" && article.featuredImagePublicId) {
      await deleteFromCloudinary(article.featuredImagePublicId, "image");
      article.featuredImage         = undefined;
      article.featuredImagePublicId = undefined;
    }

    // Recalculate read time
    article.readTimeMinutes = estimateReadTime([
      article.description,
      article.technicalExplanation,
      article.safetyInformation,
    ]);

    await article.save();

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: article,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update article", error: error.message });
  }
};

// ─── 6. DELETE / UNPUBLISH ARTICLE ───────────────────────────────────────────

/**
 * DELETE /api/articles/:id
 * Soft removal — sets status = "unpublished". Record is preserved.
 */
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }
    if (article.status === "unpublished") {
      res.status(400).json({ success: false, message: "Article is already unpublished" });
      return;
    }

    article.status = "unpublished";
    await article.save();

    res.status(200).json({
      success: true,
      message: "Article unpublished successfully",
      data: article,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to unpublish article", error: error.message });
  }
};

// ─── 7. PUBLISH ARTICLE ───────────────────────────────────────────────────────

/**
 * PATCH /api/articles/:id/publish
 * Body (JSON): { publishedAt?: ISO date string }
 * Sets status = "published" and records publishedAt.
 */
export const publishArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }
    if (article.status === "published") {
      res.status(400).json({ success: false, message: "Article is already published" });
      return;
    }

    article.status      = "published";
    article.publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : new Date();
    await article.save();

    res.status(200).json({
      success: true,
      message: "Article published successfully",
      data: { _id: article._id, status: article.status, publishedAt: article.publishedAt },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to publish article", error: error.message });
  }
};

// ─── 8. UNPUBLISH ARTICLE ────────────────────────────────────────────────────

/**
 * PATCH /api/articles/:id/unpublish
 * Sets status = "unpublished" — removes from public website.
 */
export const unpublishArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "Article not found" });
      return;
    }
    if (article.status === "unpublished") {
      res.status(400).json({ success: false, message: "Article is already unpublished" });
      return;
    }

    article.status = "unpublished";
    await article.save();

    res.status(200).json({
      success: true,
      message: "Article unpublished successfully",
      data: { _id: article._id, status: article.status },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to unpublish article", error: error.message });
  }
};
