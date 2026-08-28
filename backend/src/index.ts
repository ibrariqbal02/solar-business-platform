import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import connectDatabase from "./config/db.js";
import { connectCloudinary } from "./config/cloudinary.js";

// ─── Route imports ────────────────────────────────────────────────────────────
import authRoutes             from "./routes/auth.routes.js";
import categoryRoutes         from "./routes/category.routes.js";
import productRoutes          from "./routes/product.routes.js";
import serviceRoutes          from "./routes/service.routes.js";
import videoCategoryRoutes    from "./routes/video-category.routes.js";
import videoRoutes            from "./routes/video.routes.js";
import articleCategoryRoutes  from "./routes/article-category.routes.js";
import articleRoutes          from "./routes/article.routes.js";
import faqRoutes              from "./routes/faq.routes.js";
import testimonialRoutes      from "./routes/testimonial.routes.js";
import leadRoutes             from "./routes/lead.routes.js";
import notificationRoutes     from "./routes/notification.routes.js";
import settingsRoutes         from "./routes/settings.routes.js";
import mediaRoutes            from "./routes/media.routes.js";
import dashboardRoutes        from "./routes/dashboard.routes.js";
import analyticsRoutes        from "./routes/analytics.routes.js";
import searchRoutes           from "./routes/search.routes.js";

// ─── Error middleware ─────────────────────────────────────────────────────────
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

// ─── App setup ────────────────────────────────────────────────────────────────
const app: Application = express();

connectDatabase();
connectCloudinary();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
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
app.use("/api/media",              mediaRoutes);
app.use("/api/dashboard",          dashboardRoutes);
app.use("/api/analytics",          analyticsRoutes);
app.use("/api/search",             searchRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Solar Business Platform API is running" });
});

// ─── Error handling (must be last) ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
