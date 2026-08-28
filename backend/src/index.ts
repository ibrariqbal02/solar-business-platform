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


app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
