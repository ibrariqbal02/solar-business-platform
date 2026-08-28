import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createArticleCategory,
  getArticleCategories,
  getArticleCategoryById,
  getArticleCategoryBySlug,
  updateArticleCategory,
  deleteArticleCategory,
  toggleArticleCategoryStatus,
} from "../controllers/article-category.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",              getArticleCategories);
router.get("/slug/:slug",    getArticleCategoryBySlug);
router.get("/id/:id",        getArticleCategoryById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",           requireAuth, createArticleCategory);
router.put(   "/:id",        requireAuth, updateArticleCategory);
router.delete("/:id",        requireAuth, deleteArticleCategory);
router.patch( "/:id/status", requireAuth, toggleArticleCategoryStatus);

export default router;
