import { Router } from "express";
import multerImage from "../config/multer";
import {
  createArticle,
  getArticles,
  getArticleById,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from "../controllers/article.controller";

const router = Router();

// POST   /api/articles                   — create (multipart/form-data, field: "featuredImage")
router.post("/", multerImage.single("featuredImage"), createArticle);

// GET    /api/articles                   — list (search, filter, sort, paginate)
router.get("/", getArticles);

// GET    /api/articles/slug/:slug        — get by slug (before /:id to avoid conflict)
router.get("/slug/:slug", getArticleBySlug);

// GET    /api/articles/id/:id            — get full article by MongoDB ID
router.get("/id/:id", getArticleById);

// PUT    /api/articles/:id               — update (multipart/form-data, field: "featuredImage")
router.put("/:id", multerImage.single("featuredImage"), updateArticle);

// DELETE /api/articles/:id               — soft removal (status = "unpublished")
router.delete("/:id", deleteArticle);

// PATCH  /api/articles/:id/publish       — publish article
router.patch("/:id/publish", publishArticle);

// PATCH  /api/articles/:id/unpublish     — unpublish article
router.patch("/:id/unpublish", unpublishArticle);

export default router;
