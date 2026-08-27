import { Router } from "express";
import multerImage from "../config/multer";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
} from "../controllers/category.controller";

const router = Router();

// POST   /api/categories              — create (multipart/form-data, field: "image")
router.post("/", multerImage.single("image"), createCategory);

// GET    /api/categories              — list all (pagination, search, filter)
router.get("/", getAllCategories);

// GET    /api/categories/:identifier  — get one by ObjectId or slug
router.get("/:identifier", getCategoryById);

// PUT    /api/categories/:id          — update (multipart/form-data, field: "image")
router.put("/:id", multerImage.single("image"), updateCategory);

// DELETE /api/categories/:id          — soft delete (deactivate)
router.delete("/:id", deleteCategory);

// PATCH  /api/categories/:id/restore  — restore deactivated category
router.patch("/:id/restore", restoreCategory);

export default router;
