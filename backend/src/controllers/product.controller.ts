import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import ProductEnquiry from "../models/product-enquiry.model.js";
import AnalyticsEvent from "../models/analytics-event.model.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (Array.isArray(value)) return value as unknown as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

// ─── 1. CREATE PRODUCT ────────────────────────────────────────────────────────

/**
 * POST /api/products
 * Content-Type: multipart/form-data
 * Fields:
 *   name, shortDescription, detailedDescription, category (ObjectId),
 *   price, discountedPrice, unit, stock, isAvailable, isFeatured,
 *   features      (JSON array or repeated field)
 *   applications  (JSON array or repeated field)
 *   specifications (JSON array of { label, value })
 *   tags          (JSON array or repeated field)
 * Files:
 *   images        (field name "images", up to 10 files)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, shortDescription, detailedDescription,
      category, price, discountedPrice, unit,
      stock, isAvailable, isFeatured, tags,
    } = req.body;

    // ── Required field validation ──
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Product name is required" });
      return;
    }
    if (!category) {
      res.status(400).json({ success: false, message: "Category is required" });
      return;
    }
    if (!isValidObjectId(category as string)) {
      res.status(400).json({ success: false, message: "Invalid category ID" });
      return;
    }
    if (price === undefined || price === null || price === "") {
      res.status(400).json({ success: false, message: "Price is required" });
      return;
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
      res.status(400).json({ success: false, message: "Price must be a non-negative number" });
      return;
    }

    // ── Category validation ──
    const cat = await Category.findById(category);
    if (!cat) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }
    if (!cat.isActive) {
      res.status(400).json({ success: false, message: "Selected category is inactive" });
      return;
    }

    // ── Duplicate name check ──
    const duplicate = await Product.findOne({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    });
    if (duplicate) {
      res.status(409).json({ success: false, message: "A product with this name already exists" });
      return;
    }

    // ── Upload images ──
    const uploadedImages: { url: string; publicId: string; altText?: string; isPrimary: boolean }[] = [];
    if (req.files && Array.isArray(req.files) && (req.files as Express.Multer.File[]).length > 0) {
      const files = req.files as Express.Multer.File[];
      const results = await Promise.all(
        files.map((f) => uploadToCloudinary(f.buffer, "solar-platform/products"))
      );
      results.forEach((r, i) => {
        uploadedImages.push({
          url: r.secure_url,
          publicId: r.public_id,
          isPrimary: i === 0,
        });
      });
    }

    // ── Parse array / JSON fields ──
    const features      = parseJsonField<string[]>(req.body.features, []);
    const applications  = parseJsonField<string[]>(req.body.applications, []);
    const specifications = parseJsonField<{ label: string; value: string }[]>(req.body.specifications, []);
    const parsedTags    = parseJsonField<string[]>(tags, []);

    const stockNum = Number(stock ?? 0);

    const product = await Product.create({
      name: name.trim(),
      shortDescription: shortDescription?.trim(),
      detailedDescription: detailedDescription?.trim(),
      category,
      price: Number(price),
      discountedPrice: discountedPrice !== undefined ? Number(discountedPrice) : undefined,
      unit: unit?.trim() || "piece",
      images: uploadedImages,
      specifications,
      features,
      applications,
      tags: parsedTags,
      stock: stockNum,
      isAvailable: isAvailable !== undefined ? isAvailable === "true" || isAvailable === true : true,
      isFeatured: isFeatured === "true" || isFeatured === true,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create product", error: error.message });
  }
};

// ─── 2 & 3 & 4 & 5 & 6 & 7. GET ALL PRODUCTS (with search, filter, sort, pagination) ──

/**
 * GET /api/products
 * Query params:
 *   search       string           — text search on name, shortDescription, detailedDescription
 *   category     ObjectId         — filter by category
 *   isAvailable  "true"|"false"   — availability filter
 *   stockStatus  "in_stock"|"low_stock"|"out_of_stock"
 *   isFeatured   "true"           — featured only
 *   minPrice     number
 *   maxPrice     number
 *   sort         "newest"|"oldest"|"price_asc"|"price_desc"|"featured"|"views"
 *   page         number (default 1)
 *   limit        number (default 12, max 100)
 */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = { isActive: true };

    // Search
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    // Category filter
    if (req.query.category) {
      const catId = req.query.category as string;
      if (!isValidObjectId(catId)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      filter.category = new mongoose.Types.ObjectId(catId);
    }

    // Availability
    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === "true";
    }

    // Stock status
    if (req.query.stockStatus) {
      const allowed = ["in_stock", "low_stock", "out_of_stock"];
      if (!allowed.includes(req.query.stockStatus as string)) {
        res.status(400).json({ success: false, message: `stockStatus must be one of: ${allowed.join(", ")}` });
        return;
      }
      filter.stockStatus = req.query.stockStatus;
    }

    // Featured
    if (req.query.isFeatured === "true") filter.isFeatured = true;

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Sorting
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest:      { createdAt: -1 },
      oldest:      { createdAt: 1 },
      price_asc:   { price: 1 },
      price_desc:  { price: -1 },
      featured:    { isFeatured: -1, createdAt: -1 },
      views:       { viewCount: -1 },
    };
    const sortKey = (req.query.sort as string) || "newest";
    const sortQuery = sortMap[sortKey] ?? sortMap.newest;

    // Pagination
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip  = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .select("-detailedDescription -specifications"),   // lean list view
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: products,
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
    res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
  }
};

// ─── 8. GET PRODUCT BY ID ─────────────────────────────────────────────────────

/**
 * GET /api/products/id/:id
 * Returns full product details including category info.
 * Also tracks a product_view analytics event (fire-and-forget).
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findOne({ _id: id, isActive: true })
      .populate("category", "name slug image");

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    // Increment view count + track analytics (non-blocking)
    Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
    AnalyticsEvent.create({
      eventType: "product_view",
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.headers["referer"],
      sessionId: req.headers["x-session-id"] as string | undefined,
    }).catch(() => {});

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch product", error: error.message });
  }
};

// ─── 9. GET PRODUCT BY SLUG ───────────────────────────────────────────────────

/**
 * GET /api/products/slug/:slug
 * SEO-friendly URL lookup. Also tracks view analytics.
 */
export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const product = await Product.findOne({ slug, isActive: true })
      .populate("category", "name slug image");

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).exec();
    AnalyticsEvent.create({
      eventType: "product_view",
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.headers["referer"],
      sessionId: req.headers["x-session-id"] as string | undefined,
    }).catch(() => {});

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch product", error: error.message });
  }
};

// ─── 10. UPDATE PRODUCT ───────────────────────────────────────────────────────

/**
 * PUT /api/products/:id
 * Content-Type: multipart/form-data
 * Supports partial updates. New images are appended (or set as primary).
 * Pass removeImageIds as JSON array of publicIds to delete specific images.
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const {
      name, shortDescription, detailedDescription,
      category, price, discountedPrice, unit,
      stock, isAvailable, isFeatured, tags,
    } = req.body;

    // Name uniqueness check
    if (name && name.trim() !== product.name) {
      const conflict = await Product.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      });
      if (conflict) {
        res.status(409).json({ success: false, message: "A product with this name already exists" });
        return;
      }
      product.name = name.trim();
    }

    // Category validation
    if (category) {
      if (!isValidObjectId(category as string)) {
        res.status(400).json({ success: false, message: "Invalid category ID" });
        return;
      }
      const cat = await Category.findById(category);
      if (!cat || !cat.isActive) {
        res.status(400).json({ success: false, message: "Category not found or inactive" });
        return;
      }
      product.category = new mongoose.Types.ObjectId(category as string);
    }

    if (shortDescription !== undefined) product.shortDescription = shortDescription.trim();
    if (detailedDescription !== undefined) product.detailedDescription = detailedDescription.trim();
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        res.status(400).json({ success: false, message: "Price must be a non-negative number" });
        return;
      }
      product.price = Number(price);
    }
    if (discountedPrice !== undefined) product.discountedPrice = Number(discountedPrice);
    if (unit !== undefined) product.unit = unit.trim();
    if (stock !== undefined) product.stock = Math.max(0, Number(stock));
    if (isAvailable !== undefined) product.isAvailable = isAvailable === "true" || isAvailable === true;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === "true" || isFeatured === true;

    if (req.body.features !== undefined)
      product.features = parseJsonField<string[]>(req.body.features, product.features);
    if (req.body.applications !== undefined)
      product.applications = parseJsonField<string[]>(req.body.applications, product.applications);
    if (req.body.specifications !== undefined)
      product.specifications = parseJsonField<{ label: string; value: string }[]>(req.body.specifications, product.specifications);
    if (tags !== undefined)
      product.tags = parseJsonField<string[]>(tags, product.tags);

    // Remove specific images by publicId
    const removeImageIds = parseJsonField<string[]>(req.body.removeImageIds, []);
    if (removeImageIds.length > 0) {
      await Promise.all(removeImageIds.map((pid) => deleteFromCloudinary(pid, "image")));
      product.images = product.images.filter((img) => !removeImageIds.includes(img.publicId));
    }

    // Upload new images
    if (req.files && Array.isArray(req.files) && (req.files as Express.Multer.File[]).length > 0) {
      const files = req.files as Express.Multer.File[];
      const results = await Promise.all(
        files.map((f) => uploadToCloudinary(f.buffer, "solar-platform/products"))
      );
      // If no images remain, first new image becomes primary
      const noPrimary = product.images.every((img) => !img.isPrimary);
      results.forEach((r, i) => {
        product.images.push({
          url: r.secure_url,
          publicId: r.public_id,
          isPrimary: noPrimary && i === 0,
        });
      });
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
  }
};

// ─── 11. DELETE / DEACTIVATE PRODUCT ─────────────────────────────────────────

/**
 * DELETE /api/products/:id
 * Soft delete — sets isActive = false. Data is preserved.
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    if (!product.isActive) {
      res.status(400).json({ success: false, message: "Product is already deactivated" });
      return;
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, message: "Product deactivated successfully", data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to deactivate product", error: error.message });
  }
};

// ─── 12. TOGGLE FEATURED ─────────────────────────────────────────────────────

/**
 * PATCH /api/products/:id/featured
 * Body: { isFeatured: true | false }
 */
export const toggleFeatured = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const { isFeatured } = req.body;
    if (isFeatured === undefined) {
      res.status(400).json({ success: false, message: "isFeatured field is required" });
      return;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isFeatured: isFeatured === true || isFeatured === "true" },
      { new: true }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Product ${product.isFeatured ? "marked as featured" : "removed from featured"}`,
      data: { _id: product._id, isFeatured: product.isFeatured },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update featured status", error: error.message });
  }
};

// ─── 13. UPDATE STOCK ─────────────────────────────────────────────────────────

/**
 * PATCH /api/products/:id/stock
 * Body: { stock: number }
 * Automatically updates stockStatus (in_stock / low_stock / out_of_stock).
 */
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const { stock } = req.body;
    if (stock === undefined || stock === null || stock === "") {
      res.status(400).json({ success: false, message: "stock field is required" });
      return;
    }

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      res.status(400).json({ success: false, message: "Stock must be a non-negative number" });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    product.stock = stockNum;
    await product.save(); // pre-save hook derives stockStatus automatically

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: {
        _id: product._id,
        stock: product.stock,
        stockStatus: product.stockStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update stock", error: error.message });
  }
};

// ─── 16. PRODUCT ENQUIRY (WhatsApp / form) ────────────────────────────────────

/**
 * POST /api/products/:id/enquiry
 * Body: { customerName, customerPhone, customerEmail?, message?, quantity?, channel? }
 * Records enquiry, increments product.enquiryCount, fires analytics event.
 */
export const submitProductEnquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findOne({ _id: id, isActive: true });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const { customerName, customerPhone, customerEmail, message, quantity, channel } = req.body;

    if (!customerName?.trim()) {
      res.status(400).json({ success: false, message: "Customer name is required" });
      return;
    }
    if (!customerPhone?.trim()) {
      res.status(400).json({ success: false, message: "Customer phone is required" });
      return;
    }

    const allowedChannels = ["whatsapp", "call", "email", "form"];
    if (channel && !allowedChannels.includes(channel)) {
      res.status(400).json({ success: false, message: `channel must be one of: ${allowedChannels.join(", ")}` });
      return;
    }

    const enquiry = await ProductEnquiry.create({
      product: product._id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail?.trim().toLowerCase(),
      message: message?.trim(),
      quantity: quantity ? Math.max(1, Number(quantity)) : 1,
      channel: channel || "whatsapp",
    });

    // Increment enquiry count + track analytics (non-blocking)
    Product.findByIdAndUpdate(id, { $inc: { enquiryCount: 1 } }).exec();
    AnalyticsEvent.create({
      eventType: "product_enquiry",
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { channel: enquiry.channel, quantity: enquiry.quantity },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to submit enquiry", error: error.message });
  }
};

// ─── 18. RELATED PRODUCTS ─────────────────────────────────────────────────────

/**
 * GET /api/products/:id/related
 * Returns up to 6 active products in the same category, excluding the current product.
 */
export const getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id).select("category");
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const related = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isActive: true,
    })
      .populate("category", "name slug")
      .select("name slug shortDescription images price discountedPrice unit isFeatured stockStatus")
      .limit(6);

    res.status(200).json({ success: true, count: related.length, data: related });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch related products", error: error.message });
  }
};

// ─── 19. PRODUCT VIEW TRACKING (standalone endpoint) ─────────────────────────

/**
 * POST /api/products/:id/view
 * Lightweight endpoint for the frontend to explicitly track a product view
 * (useful for SPAs where the GET endpoint is cached).
 */
export const trackProductView = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isActive: true },
      { $inc: { viewCount: 1 } },
      { new: true, select: "_id viewCount" }
    );

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    AnalyticsEvent.create({
      eventType: "product_view",
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.headers["referer"],
      sessionId: req.headers["x-session-id"] as string | undefined,
    }).catch(() => {});

    res.status(200).json({ success: true, data: { _id: product._id, viewCount: product.viewCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to track view", error: error.message });
  }
};

// ─── RESTORE PRODUCT ──────────────────────────────────────────────────────────

/**
 * PATCH /api/products/:id/restore
 * Re-activates a soft-deleted product.
 */
export const restoreProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    if (product.isActive) {
      res.status(400).json({ success: false, message: "Product is already active" });
      return;
    }

    product.isActive = true;
    await product.save();

    res.status(200).json({ success: true, message: "Product restored successfully", data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to restore product", error: error.message });
  }
};
