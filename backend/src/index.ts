import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDatabase from "./config/db";
import { connectCloudinary } from "./config/cloudinary";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import serviceRoutes from "./routes/service.routes";
import videoCategoryRoutes from "./routes/video-category.routes";
import videoRoutes from "./routes/video.routes";
import articleCategoryRoutes from "./routes/article-category.routes";

const app:Application = express();
// middleware
connectDatabase();
connectCloudinary();
app.use(helmet());
const PORT = process.env.PORT || 5000;
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 

// routes
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/video-categories", videoCategoryRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/article-categories", articleCategoryRoutes);


app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
