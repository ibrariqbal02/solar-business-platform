import { Router } from "express";
import multerImage from "../config/multer.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
} from "../controllers/category.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",             getAllCategories);
router.get("/:identifier",  getCategoryById);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",                  requireAuth, multerImage.single("image"), createCategory);
router.put(   "/:id",               requireAuth, multerImage.single("image"), updateCategory);
router.delete("/:id",               requireAuth, deleteCategory);
router.patch( "/:id/restore",       requireAuth, restoreCategory);

export default router;
