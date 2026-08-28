import { Router } from "express";
import multerImage from "../config/multer";
import {
  createService,
  getServices,
  getServiceById,
  getServiceBySlug,
  updateService,
  deleteService,
  toggleServiceStatus,
} from "../controllers/service.controller";

const router = Router();

// POST   /api/services                  — create (multipart/form-data, field: "image")
router.post("/", multerImage.single("image"), createService);

// GET    /api/services                  — list all (pagination, search, filter)
router.get("/", getServices);

// GET    /api/services/slug/:slug       — get by slug (before /:id to avoid conflict)
router.get("/slug/:slug", getServiceBySlug);

// GET    /api/services/id/:id           — get by ID
router.get("/id/:id", getServiceById);

// PUT    /api/services/:id              — update (multipart/form-data, field: "image")
router.put("/:id", multerImage.single("image"), updateService);

// DELETE /api/services/:id              — soft delete
router.delete("/:id", deleteService);

// PATCH  /api/services/:id/status       — toggle active/inactive
router.patch("/:id/status", toggleServiceStatus);

export default router;
