import { Router } from "express";
import { globalSearch } from "../controllers/search.controller.js";

const router = Router();

// Public — no auth required
router.get("/", globalSearch);

export default router;
