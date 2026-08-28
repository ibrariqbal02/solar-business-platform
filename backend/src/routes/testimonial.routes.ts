import { Router } from "express";
import multerImage from "../config/multer.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createTestimonial, getPublicTestimonials, getAllTestimonials,
  getTestimonialById, updateTestimonial, approveTestimonial,
  toggleTestimonialVisibility, deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = Router();

// Public
router.post("/",         multerImage.single("customerImage"), createTestimonial);
router.get("/",          getPublicTestimonials);

// Admin
router.get("/admin",           requireAuth, getAllTestimonials);
router.get("/:id",             requireAuth, getTestimonialById);
router.put("/:id",             requireAuth, multerImage.single("customerImage"), updateTestimonial);
router.patch("/:id/approve",   requireAuth, approveTestimonial);
router.patch("/:id/visibility",requireAuth, toggleTestimonialVisibility);
router.delete("/:id",          requireAuth, deleteTestimonial);

export default router;
