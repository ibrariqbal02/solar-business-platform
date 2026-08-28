import { Request, Response } from "express";
import mongoose from "mongoose";
import Testimonial from "../models/testimonial.model.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ─── PUBLIC: Submit testimonial ───────────────────────────────────────────────
// POST /api/testimonials
export const createTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, customerLocation, review, rating, relatedProduct, relatedService } = req.body;

    if (!customerName?.trim()) { res.status(400).json({ success: false, message: "Customer name is required" }); return; }
    if (!review?.trim())       { res.status(400).json({ success: false, message: "Review is required" }); return; }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ success: false, message: "Rating must be between 1 and 5" }); return;
    }
    if (relatedProduct && !isValidId(relatedProduct as string)) {
      res.status(400).json({ success: false, message: "Invalid product ID" }); return;
    }

    let customerImage: string | undefined;
    let customerImagePublicId: string | undefined;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/testimonials");
      customerImage = uploaded.secure_url;
      customerImagePublicId = uploaded.public_id;
    }

    const testimonial = await Testimonial.create({
      customerName: customerName.trim(),
      customerLocation: customerLocation?.trim(),
      review: review.trim(),
      rating: ratingNum,
      relatedProduct: relatedProduct || undefined,
      relatedService: relatedService?.trim(),
      customerImage,
      customerImagePublicId,
    });

    res.status(201).json({ success: true, message: "Testimonial submitted successfully", data: testimonial });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to submit testimonial", error: error.message });
  }
};

// ─── PUBLIC: Get approved & visible testimonials ──────────────────────────────
// GET /api/testimonials
export const getPublicTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const filter: Record<string, any> = { status: "approved", isVisible: true };
    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .populate("relatedProduct", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit),
      Testimonial.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: testimonials,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch testimonials", error: error.message });
  }
};

// ─── ADMIN: Get all testimonials ──────────────────────────────────────────────
// GET /api/testimonials/admin
export const getAllTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.status)    filter.status    = req.query.status;
    if (req.query.isVisible) filter.isVisible = req.query.isVisible === "true";

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter).populate("relatedProduct", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Testimonial.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true, data: testimonials,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch testimonials", error: error.message });
  }
};

// ─── ADMIN: Get one ───────────────────────────────────────────────────────────
export const getTestimonialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid testimonial ID" }); return; }
    const t = await Testimonial.findById(id).populate("relatedProduct", "name slug");
    if (!t) { res.status(404).json({ success: false, message: "Testimonial not found" }); return; }
    res.status(200).json({ success: true, data: t });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch testimonial", error: error.message });
  }
};

// ─── ADMIN: Update ────────────────────────────────────────────────────────────
export const updateTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid testimonial ID" }); return; }
    const t = await Testimonial.findById(id);
    if (!t) { res.status(404).json({ success: false, message: "Testimonial not found" }); return; }

    const { customerName, customerLocation, review, rating, relatedProduct, relatedService, adminNote, removeImage } = req.body;
    if (customerName  !== undefined) t.customerName     = customerName.trim();
    if (customerLocation !== undefined) t.customerLocation = customerLocation.trim();
    if (review        !== undefined) t.review           = review.trim();
    if (rating        !== undefined) {
      const r = Number(rating);
      if (isNaN(r) || r < 1 || r > 5) { res.status(400).json({ success: false, message: "Rating must be 1–5" }); return; }
      t.rating = r;
    }
    if (relatedProduct !== undefined) t.relatedProduct = relatedProduct ? new mongoose.Types.ObjectId(relatedProduct as string) : undefined;
    if (relatedService !== undefined) t.relatedService  = relatedService?.trim();
    if (adminNote      !== undefined) t.adminNote       = adminNote?.trim();

    if (req.file) {
      if (t.customerImagePublicId) await deleteFromCloudinary(t.customerImagePublicId, "image");
      const uploaded = await uploadToCloudinary(req.file.buffer, "solar-platform/testimonials");
      t.customerImage = uploaded.secure_url;
      t.customerImagePublicId = uploaded.public_id;
    } else if (removeImage === "true" && t.customerImagePublicId) {
      await deleteFromCloudinary(t.customerImagePublicId, "image");
      t.customerImage = undefined; t.customerImagePublicId = undefined;
    }

    await t.save();
    res.status(200).json({ success: true, message: "Testimonial updated", data: t });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update testimonial", error: error.message });
  }
};

// ─── ADMIN: Approve ───────────────────────────────────────────────────────────
export const approveTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid ID" }); return; }
    const t = await Testimonial.findByIdAndUpdate(id, { status: "approved", isVisible: true }, { new: true });
    if (!t) { res.status(404).json({ success: false, message: "Testimonial not found" }); return; }
    res.status(200).json({ success: true, message: "Testimonial approved", data: t });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to approve", error: error.message });
  }
};

// ─── ADMIN: Toggle visibility ─────────────────────────────────────────────────
export const toggleTestimonialVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid ID" }); return; }
    const { isVisible } = req.body;
    if (isVisible === undefined) { res.status(400).json({ success: false, message: "isVisible is required" }); return; }
    const t = await Testimonial.findByIdAndUpdate(id, { isVisible: isVisible === true || isVisible === "true" }, { new: true, select: "_id customerName isVisible status" });
    if (!t) { res.status(404).json({ success: false, message: "Testimonial not found" }); return; }
    res.status(200).json({ success: true, message: `Testimonial ${t.isVisible ? "shown" : "hidden"}`, data: t });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to toggle visibility", error: error.message });
  }
};

// ─── ADMIN: Delete ────────────────────────────────────────────────────────────
export const deleteTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid ID" }); return; }
    const t = await Testimonial.findById(id);
    if (!t) { res.status(404).json({ success: false, message: "Testimonial not found" }); return; }
    if (t.customerImagePublicId) await deleteFromCloudinary(t.customerImagePublicId, "image");
    await t.deleteOne();
    res.status(200).json({ success: true, message: "Testimonial deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete testimonial", error: error.message });
  }
};
