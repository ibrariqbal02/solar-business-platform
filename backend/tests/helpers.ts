/**
 * Shared helpers: Express app factory, token generator, seed functions.
 */
import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { signAccessToken } from "../src/utils/jwt.js";
import Admin from "../src/models/admin.model.js";
import { hashPassword } from "../src/utils/password.js";

// ── Lazy app factory (no app.listen) ─────────────────────────────────────────
export const buildApp = async (): Promise<Application> => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Import routes dynamically so env vars are set before module load
  const [
    { default: authRoutes },
    { default: categoryRoutes },
    { default: productRoutes },
    { default: serviceRoutes },
    { default: videoCategoryRoutes },
    { default: videoRoutes },
    { default: articleCategoryRoutes },
    { default: articleRoutes },
    { default: faqRoutes },
    { default: testimonialRoutes },
    { default: leadRoutes },
    { default: notificationRoutes },
    { default: settingsRoutes },
    { default: dashboardRoutes },
    { default: analyticsRoutes },
    { default: searchRoutes },
    { default: mediaRoutes },
  ] = await Promise.all([
    import("../src/routes/auth.routes.js"),
    import("../src/routes/category.routes.js"),
    import("../src/routes/product.routes.js"),
    import("../src/routes/service.routes.js"),
    import("../src/routes/video-category.routes.js"),
    import("../src/routes/video.routes.js"),
    import("../src/routes/article-category.routes.js"),
    import("../src/routes/article.routes.js"),
    import("../src/routes/faq.routes.js"),
    import("../src/routes/testimonial.routes.js"),
    import("../src/routes/lead.routes.js"),
    import("../src/routes/notification.routes.js"),
    import("../src/routes/settings.routes.js"),
    import("../src/routes/dashboard.routes.js"),
    import("../src/routes/analytics.routes.js"),
    import("../src/routes/search.routes.js"),
    import("../src/routes/media.routes.js"),
  ]);

  app.use("/api/auth",               authRoutes);
  app.use("/api/categories",         categoryRoutes);
  app.use("/api/products",           productRoutes);
  app.use("/api/services",           serviceRoutes);
  app.use("/api/video-categories",   videoCategoryRoutes);
  app.use("/api/videos",             videoRoutes);
  app.use("/api/article-categories", articleCategoryRoutes);
  app.use("/api/articles",           articleRoutes);
  app.use("/api/faqs",               faqRoutes);
  app.use("/api/testimonials",       testimonialRoutes);
  app.use("/api/leads",              leadRoutes);
  app.use("/api/notifications",      notificationRoutes);
  app.use("/api/settings",           settingsRoutes);
  app.use("/api/dashboard",          dashboardRoutes);
  app.use("/api/analytics",          analyticsRoutes);
  app.use("/api/search",             searchRoutes);
  app.use("/api/media",              mediaRoutes);

  app.get("/api/health", (_req, res) => res.json({ success: true }));

  return app;
};

// ── Seed an active admin and return a valid access token ─────────────────────
export const seedAdminAndToken = async (): Promise<{ adminId: string; token: string }> => {
  // Reuse existing admin if already seeded (Admin collection is not wiped between tests)
  let admin = await Admin.findOne({ email: "admin@test.com" });
  if (!admin) {
    admin = await Admin.create({
      name:     "Test Admin",
      email:    "admin@test.com",
      password: await hashPassword("TestPass123!"),
      role:     "admin",
      isActive: true,
    });
  }
  const adminId = (admin._id as any).toString();
  const token   = signAccessToken(adminId, admin.role);
  return { adminId, token };
};

// ── Auth header helper ────────────────────────────────────────────────────────
export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
