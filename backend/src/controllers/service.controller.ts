import { Request, Response } from "express";
import mongoose from "mongoose";
import Service from "../models/service.model";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const parseJsonArray = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
};

// ─── 1. CREATE SERVICE ────────────────────────────────────────────────────────

/**
 * POST /api/services
 * Content-Type: multipart/form-data
 * Fields:
 *   name*            string
 *   shortDescription string
 *   description      string
 *   areas            JSON array  e.g. ["Lahore","Karachi"]
 *   features         JSON array
 *   cta              JSON object { label, url?, type }
 *   order            number
 * File:
 *   image            single image (field name "image")
 */
export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, shortDescription, description, order } = req.body;

    // Required
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Service name is required" });
      return;
    }

    // Duplicate name check
    const exists = await Service.findOne({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    });
    if (exists) {
      res.status(409).json({ success: false, message: "A service with this name already exists" });
      return;
    }

    // Parse array / object fields
    const areas    = parseJsonArray(req.body.areas);
    const features = parseJsonArray(req.body.features);
    const cta = (() => {
      if (!req.body.cta) return undefined;
      if (typeof req.body.cta === "object") return req.body.cta;
      try { return JSON.parse(req.body.cta); } catch { return undefined; }
    })();

    // Image upload
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/services");
      imageUrl      = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    const service = await Service.create({
      name: name.trim(),
      shortDescription: shortDescription?.trim(),
      description: description?.trim(),
      areas,
      features,
      cta,
      order: order !== undefined ? Number(order) : 0,
      image: imageUrl,
      imagePublicId,
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create service", error: error.message });
  }
};

// ─── 2. GET ALL SERVICES ──────────────────────────────────────────────────────

/**
 * GET /api/services
 * Query params:
 *   active  "true"|"false"   filter by isActive (omit = all)
 *   search  string           partial name match
 *   area    string           filter by coverage area
 *   page    number           default 1
 *   limit   number           default 10, max 100
 *   sort    "order"|"newest"|"oldest"  default "order"
 */
export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.active === "true")  filter.isActive = true;
    if (req.query.active === "false") filter.isActive = false;

    if (req.query.search) {
      filter.name = { $regex: escapeRegex(req.query.search as string), $options: "i" };
    }

    if (req.query.area) {
      filter.areas = { $in: [req.query.area as string] };
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      order:  { order: 1, createdAt: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sortKey   = (req.query.sort as string) || "order";
    const sortQuery = sortMap[sortKey] ?? sortMap.order;

    const [services, total] = await Promise.all([
      Service.find(filter).sort(sortQuery).skip(skip).limit(limit),
      Service.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch services", error: error.message });
  }
};

// ─── 3. GET SERVICE BY ID ─────────────────────────────────────────────────────

/**
 * GET /api/services/id/:id
 */
export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const service = await Service.findById(id);
    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    res.status(200).json({ success: true, data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch service", error: error.message });
  }
};

// ─── 4. GET SERVICE BY SLUG ───────────────────────────────────────────────────

/**
 * GET /api/services/slug/:slug
 */
export const getServiceBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const service = await Service.findOne({ slug });
    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    res.status(200).json({ success: true, data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch service", error: error.message });
  }
};

// ─── 5. UPDATE SERVICE ────────────────────────────────────────────────────────

/**
 * PUT /api/services/:id
 * Content-Type: multipart/form-data
 * All fields optional. Pass removeImage="true" to clear the current image.
 */
export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const service = await Service.findById(id);
    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    const { name, shortDescription, description, order, removeImage } = req.body;

    // Name uniqueness check
    if (name && name.trim() !== service.name) {
      const conflict = await Service.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "A service with this name already exists" });
        return;
      }
      service.name = name.trim();
    }

    if (shortDescription !== undefined) service.shortDescription = shortDescription.trim();
    if (description      !== undefined) service.description      = description.trim();
    if (order            !== undefined) service.order            = Number(order);

    if (req.body.areas    !== undefined) service.areas    = parseJsonArray(req.body.areas,    service.areas);
    if (req.body.features !== undefined) service.features = parseJsonArray(req.body.features, service.features);

    if (req.body.cta !== undefined) {
      const cta = typeof req.body.cta === "object"
        ? req.body.cta
        : (() => { try { return JSON.parse(req.body.cta); } catch { return null; } })();
      if (cta) service.cta = cta;
    }

    // Image handling
    if (req.file) {
      if (service.imagePublicId) await deleteFromCloudinary(service.imagePublicId, "image");
      const uploaded    = await uploadToCloudinary(req.file.buffer, "solar-platform/services");
      service.image          = uploaded.secure_url;
      service.imagePublicId  = uploaded.public_id;
    } else if (removeImage === "true" && service.imagePublicId) {
      await deleteFromCloudinary(service.imagePublicId, "image");
      service.image         = undefined;
      service.imagePublicId = undefined;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update service", error: error.message });
  }
};

// ─── 6. DELETE / DEACTIVATE SERVICE ──────────────────────────────────────────

/**
 * DELETE /api/services/:id
 * Soft delete — sets isActive = false. Data is preserved.
 */
export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const service = await Service.findById(id);
    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }
    if (!service.isActive) {
      res.status(400).json({ success: false, message: "Service is already deactivated" });
      return;
    }

    service.isActive = false;
    await service.save();

    res.status(200).json({
      success: true,
      message: "Service deactivated successfully",
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to deactivate service", error: error.message });
  }
};

// ─── 7. TOGGLE SERVICE STATUS ─────────────────────────────────────────────────

/**
 * PATCH /api/services/:id/status
 * Body: { isActive: true | false }
 * Quick activate/deactivate without a full update round-trip.
 */
export const toggleServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID" });
      return;
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      res.status(400).json({ success: false, message: "isActive field is required" });
      return;
    }

    const service = await Service.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === "true" },
      { new: true, select: "_id name isActive" }
    );

    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle service status", error: error.message });
  }
};
