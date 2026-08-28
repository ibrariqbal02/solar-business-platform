import { Router } from "express";
import multerImage from "../config/multer.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  updateStock,
  submitProductEnquiry,
  getRelatedProducts,
  trackProductView,
  restoreProduct,
} from "../controllers/product.controller.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",                  getAllProducts);
router.get("/slug/:slug",        getProductBySlug);
router.get("/id/:id",            getProductById);
router.get("/:id/related",       getRelatedProducts);
router.post("/:id/enquiry",      submitProductEnquiry);
router.post("/:id/view",         trackProductView);

// ─── Protected (admin) ────────────────────────────────────────────────────────
router.post(  "/",               requireAuth, multerImage.array("images", 10), createProduct);
router.put(   "/:id",            requireAuth, multerImage.array("images", 10), updateProduct);
router.delete("/:id",            requireAuth, deleteProduct);
router.patch( "/:id/featured",   requireAuth, toggleFeatured);
router.patch( "/:id/stock",      requireAuth, updateStock);
router.patch( "/:id/restore",    requireAuth, restoreProduct);

export default router;
