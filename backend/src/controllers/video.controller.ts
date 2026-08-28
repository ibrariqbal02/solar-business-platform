import { Request, Response } from "express";
import mongoose from "mongoose";
import Video from "../models/video.model";
import VideoCategory from "../models/video-category.model";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/** Extract YouTube video ID from various URL formats or a bare ID */
const extractYoutubeId = (input: string): string | null => {
  const bare = /^[a-zA-Z0-9_-]{11}$/.test(input.trim());
  if (bare) return input.trim();

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,          // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,      // youtu.be/
    /embed\/([a-zA-Z0-9_-]{11})/,          // /embed/
    /shorts\/([a-zA-Z0-9_-]{11})/,         // /shorts/
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) return m[1];
  }
  return null;
};

const buildYoutubeUrl   = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const buildAutoThumb    = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// ─── 1. CREATE VIDEO ──────────────────────────────────────────────────────────

/**
 * POST /api/videos
 * Body (JSON):
 *   title*          string
 *   youtubeVideoId* string  — bare ID or any YouTube URL format
 *   category*       ObjectId
 *   description     string
 *   thumbnail       string  — custom thumbnail URL (auto-set from YouTube if omitted)
 *   publishedAt     ISO date string
 *   duration        string  e.g. "5:34"
 *   tags            string[]
 *   isVisible       boolean (default true)
 *   isFeatured      boolean (default false)
 */
export const createVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title, description, youtubeVideoId, category,
      thumbnail, publishedAt, duration, tags,
      isVisible, isFeatured,
    } = req.body;

    // Required fields
    if (!title?.trim()) {
      res.status(400).json({ success: false, message: "Video title is required" });
      return;
    }
    if (!youtubeVideoId?.trim()) {
      res.status(400).json({ success: false, message: "YouTube video ID is required" });
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

    // Normalise YouTube ID
    const ytId = extractYoutubeId(youtubeVideoId.trim());
    if (!ytId) {
      res.status(400).json({ success: false, message: "Invalid YouTube video ID or URL" });
      return;
    }

    // YouTube duplicate check
    const duplicate = await Video.findOne({ youtubeVideoId: ytId });
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: `This YouTube video (${ytId}) is already stored`,
        data: { existingId: duplicate._id },
      });
      return;
    }

    // Category validation
    const cat = await VideoCategory.findById(category);
    if (!cat) {
      res.status(404).json({ success: false, message: "Video category not found" });
      return;
    }
    if (!cat.isActive) {
      res.status(400).json({ success: false, message: "Selected video category is inactive" });
      return;
    }

    const video = await Video.create({
      title:          title.trim(),
      description:    description?.trim(),
      youtubeVideoId: ytId,
      youtubeUrl:     buildYoutubeUrl(ytId),
      thumbnail:      thumbnail?.trim() || buildAutoThumb(ytId),
      category,
      publishedAt:    publishedAt ? new Date(publishedAt) : new Date(),
      duration:       duration?.trim(),
      tags:           Array.isArray(tags) ? tags : [],
      isVisible:      isVisible  !== undefined ? isVisible  === true || isVisible  === "true" : true,
      isFeatured:     isFeatured !== undefined ? isFeatured === true || isFeatured === "true" : false,
    });

    res.status(201).json({
      success: true,
      message: "Video created successfully",
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create video", error: error.message });
  }
};

// ─── 2. GET VIDEOS (paginate, search, filter, sort) ───────────────────────────

/**
 * GET /api/videos
 * Query params:
 *   search      string           — title / description text search
 *   category    ObjectId         — filter by video category
 *   isVisible   "true"|"false"   — visibility filter
 *   isFeatured  "true"           — featured only
 *   sort        "newest"|"oldest"|"featured"|"views"  (default "newest")
 *   page        number (default 1)
 *   limit       number (default 12, max 100)
 */
export const getVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    // Search
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    // Category filter
    if (req.query.category) {
      const catId = req.query.category as string;
      if (!isValidId(catId)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      filter.category = new mongoose.Types.ObjectId(catId);
    }

    // Visibility filter
    if (req.query.isVisible !== undefined) {
      filter.isVisible = req.query.isVisible === "true";
    }

    // Featured filter
    if (req.query.isFeatured === "true") filter.isFeatured = true;

    // Sorting
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest:   { publishedAt: -1 },
      oldest:   { publishedAt:  1 },
      featured: { isFeatured: -1, publishedAt: -1 },
      views:    { viewCount:  -1 },
    };
    const sortQuery = sortMap[(req.query.sort as string)] ?? sortMap.newest;

    // Pagination
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip  = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate("category", "name slug")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .select("-description"),      // lean list — omit long description
      Video.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: videos,
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
    res.status(500).json({ success: false, message: "Failed to fetch videos", error: error.message });
  }
};

// ─── 3. GET VIDEO BY ID ───────────────────────────────────────────────────────

/**
 * GET /api/videos/id/:id
 * Returns full video details including category.
 */
export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID" });
      return;
    }

    const video = await Video.findById(id).populate("category", "name slug");
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }

    // Increment view count (non-blocking)
    Video.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

    res.status(200).json({ success: true, data: video });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch video", error: error.message });
  }
};

// ─── 4. GET VIDEO BY YOUTUBE ID ───────────────────────────────────────────────

/**
 * GET /api/videos/youtube/:youtubeId
 * Useful for sync checks and avoiding duplicates before inserting.
 */
export const getVideoByYoutubeId = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw     = req.params.youtubeId as string;
    const ytId    = extractYoutubeId(raw);

    if (!ytId) {
      res.status(400).json({ success: false, message: "Invalid YouTube video ID" });
      return;
    }

    const video = await Video.findOne({ youtubeVideoId: ytId }).populate("category", "name slug");
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }

    res.status(200).json({ success: true, data: video });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch video", error: error.message });
  }
};

// ─── 5. UPDATE VIDEO ──────────────────────────────────────────────────────────

/**
 * PUT /api/videos/:id
 * Body (JSON): any subset of video fields.
 * If youtubeVideoId changes, re-validates uniqueness and auto-updates youtubeUrl + thumbnail.
 */
export const updateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID" });
      return;
    }

    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }

    const {
      title, description, youtubeVideoId, category,
      thumbnail, publishedAt, duration, tags,
      isVisible, isFeatured,
    } = req.body;

    // YouTube ID change
    if (youtubeVideoId !== undefined) {
      const ytId = extractYoutubeId(youtubeVideoId.trim());
      if (!ytId) {
        res.status(400).json({ success: false, message: "Invalid YouTube video ID or URL" });
        return;
      }
      if (ytId !== video.youtubeVideoId) {
        const conflict = await Video.findOne({ youtubeVideoId: ytId, _id: { $ne: id } });
        if (conflict) {
          res.status(409).json({
            success: false,
            message: `This YouTube video (${ytId}) is already stored`,
            data: { existingId: conflict._id },
          });
          return;
        }
        video.youtubeVideoId = ytId;
        video.youtubeUrl     = buildYoutubeUrl(ytId);
        // Reset thumbnail to YouTube auto-thumb if no custom one provided
        if (!thumbnail) video.thumbnail = buildAutoThumb(ytId);
      }
    }

    // Category change
    if (category !== undefined) {
      if (!isValidId(category as string)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      const cat = await VideoCategory.findById(category);
      if (!cat || !cat.isActive) {
        res.status(400).json({ success: false, message: "Video category not found or inactive" });
        return;
      }
      video.category = new mongoose.Types.ObjectId(category as string);
    }

    if (title       !== undefined) video.title       = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (thumbnail   !== undefined) video.thumbnail   = thumbnail.trim();
    if (duration    !== undefined) video.duration    = duration.trim();
    if (publishedAt !== undefined) video.publishedAt = new Date(publishedAt);
    if (tags        !== undefined) video.tags        = Array.isArray(tags) ? tags : video.tags;
    if (isVisible   !== undefined) video.isVisible   = isVisible  === true || isVisible  === "true";
    if (isFeatured  !== undefined) video.isFeatured  = isFeatured === true || isFeatured === "true";

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update video", error: error.message });
  }
};

// ─── 6. DELETE / HIDE VIDEO ───────────────────────────────────────────────────

/**
 * DELETE /api/videos/:id
 * Soft removal — sets isVisible = false. Record is preserved.
 */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID" });
      return;
    }

    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }
    if (!video.isVisible) {
      res.status(400).json({ success: false, message: "Video is already hidden" });
      return;
    }

    video.isVisible = false;
    await video.save();

    res.status(200).json({ success: true, message: "Video hidden successfully", data: video });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to hide video", error: error.message });
  }
};

// ─── 7. TOGGLE VISIBILITY ─────────────────────────────────────────────────────

/**
 * PATCH /api/videos/:id/visibility
 * Body (JSON): { isVisible: true | false }
 */
export const toggleVideoVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID" });
      return;
    }

    const { isVisible } = req.body;
    if (isVisible === undefined) {
      res.status(400).json({ success: false, message: "isVisible field is required" });
      return;
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { isVisible: isVisible === true || isVisible === "true" },
      { new: true, select: "_id title isVisible" }
    );
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Video ${video.isVisible ? "made visible" : "hidden"} successfully`,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle visibility", error: error.message });
  }
};

// ─── 8. TOGGLE FEATURED ───────────────────────────────────────────────────────

/**
 * PATCH /api/videos/:id/featured
 * Body (JSON): { isFeatured: true | false }
 */
export const toggleVideoFeatured = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID" });
      return;
    }

    const { isFeatured } = req.body;
    if (isFeatured === undefined) {
      res.status(400).json({ success: false, message: "isFeatured field is required" });
      return;
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { isFeatured: isFeatured === true || isFeatured === "true" },
      { new: true, select: "_id title isFeatured" }
    );
    if (!video) {
      res.status(404).json({ success: false, message: "Video not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Video ${video.isFeatured ? "marked as featured" : "removed from featured"}`,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle featured status", error: error.message });
  }
};
