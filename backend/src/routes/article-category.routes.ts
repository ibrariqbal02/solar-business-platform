import { Router } from "express";
import {
  createArticleCategory,
  getArticleCategories,
  getArticleCategoryById,
  getArticleCategoryBySlug,
  updateArticleCategory,
  deleteArticleCategory,
  toggleArticleCategoryStatus,
} from "../controllers/article-category.controller";

const router = Router();

// POST   /api/article-categories              — create
router.post("/", createArticleCategory);

// GET    /api/article-categories              — list all (pagination, search, filter)
router.get("/", getArticleCategories);

// GET    /api/article-categories/slug/:slug   — get by slug (before /:id to avoid conflict)
router.get("/slug/:slug", getArticleCategoryBySlug);

// GET    /api/article-categories/id/:id       — get by ID
router.get("/id/:id", getArticleCategoryById);

// PUT    /api/article-categories/:id          — update
router.put("/:id", updateArticleCategory);

// DELETE /api/article-categories/:id          — soft delete
router.delete("/:id", deleteArticleCategory);

// PATCH  /api/article-categories/:id/status   — toggle active/inactive
router.patch("/:id/status", toggleArticleCategoryStatus);

export default router;
