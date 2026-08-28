import { Router } from "express";
import multerImage from "../config/multer";
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
} from "../controllers/product.controller";

const router = Router();



router.get("/", getAllProducts);


router.post("/", multerImage.array("images", 10), createProduct);




router.get("/slug/:slug", getProductBySlug);




router.get("/id/:id", getProductById);


router.put("/:id", multerImage.array("images", 10), updateProduct);


router.delete("/:id", deleteProduct);




router.patch("/:id/featured", toggleFeatured);


router.patch("/:id/stock", updateStock);


router.patch("/:id/restore", restoreProduct);


router.post("/:id/enquiry", submitProductEnquiry);


router.get("/:id/related", getRelatedProducts);


router.post("/:id/view", trackProductView);

export default router;
