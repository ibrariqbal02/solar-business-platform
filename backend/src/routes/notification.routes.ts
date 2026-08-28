import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from "../controllers/notification.controller.js";

const router = Router();

// All notification routes are admin-only
router.get("/",                requireAuth, getNotifications);
router.get("/unread-count",    requireAuth, getUnreadCount);
router.put("/read-all",        requireAuth, markAllAsRead);
router.put("/:id/read",        requireAuth, markAsRead);
router.delete("/:id",          requireAuth, deleteNotification);

export default router;
