import { Router } from "express";
import multerImage from "../config/multer.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createArticle,
  getArticles,
  getArticleById,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from "../controllers/article.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",              getArticles);
router.get("/slug/:slug",    getArticleBySlug);
router.get("/id/:id",        getArticleById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",               requireAuth, multerImage.single("featuredImage"), createArticle);
router.put(   "/:id",            requireAuth, multerImage.single("featuredImage"), updateArticle);
router.delete("/:id",            requireAuth, deleteArticle);
router.patch( "/:id/publish",    requireAuth, publishArticle);
router.patch( "/:id/unpublish",  requireAuth, unpublishArticle);

export default router;
