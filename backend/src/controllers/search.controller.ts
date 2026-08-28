import { Request, Response } from "express";
import Product from "../models/product.model.js";
import Service from "../models/service.model.js";
import Video from "../models/video.model.js";
import Article from "../models/article.model.js";
import FAQ from "../models/faq.model.js";

// GET /api/search?q=inverter+error&limit=5
export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
      return;
    }

    // Escape regex special chars to prevent ReDoS
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit as string) || 5));

    const [products, services, videos, articles, faqs] = await Promise.all([
      Product.find({
        isActive: true,
        $or: [
          { name:             { $regex: escaped, $options: "i" } },
          { shortDescription: { $regex: escaped, $options: "i" } },
        ],
      }).select("name slug shortDescription images price unit stockStatus").limit(limit),

      Service.find({
        isActive: true,
        $or: [
          { name:             { $regex: escaped, $options: "i" } },
          { shortDescription: { $regex: escaped, $options: "i" } },
          { description:      { $regex: escaped, $options: "i" } },
        ],
      }).select("name slug shortDescription image").limit(limit),

      Video.find({
        isVisible: true,
        $or: [
          { title:       { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
        ],
      }).select("title youtubeVideoId thumbnail youtubeUrl").limit(limit),

      Article.find({
        status: "published",
        $or: [
          { title:   { $regex: escaped, $options: "i" } },
          { excerpt: { $regex: escaped, $options: "i" } },
        ],
      }).select("title slug excerpt featuredImage publishedAt").limit(limit),

      FAQ.find({
        isActive: true,
        $or: [
          { question: { $regex: escaped, $options: "i" } },
          { answer:   { $regex: escaped, $options: "i" } },
        ],
      }).select("question answer category").limit(limit),
    ]);

    const totalResults = products.length + services.length + videos.length + articles.length + faqs.length;

    res.status(200).json({
      success: true,
      data: {
        query: q,
        totalResults,
        results: { products, services, videos, articles, faqs },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
};
