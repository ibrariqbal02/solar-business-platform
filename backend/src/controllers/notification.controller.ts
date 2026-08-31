import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET /api/notifications?unread=true&page=&limit=
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.unread === "true") filter.isRead = false;

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: error.message });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.status(200).json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to get unread count", error: error.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid notification ID" }); return; }
    const n = await Notification.findByIdAndUpdate(id, { isRead: true, readAt: new Date() }, { returnDocument: "after" });
    if (!n) { res.status(404).json({ success: false, message: "Notification not found" }); return; }
    res.status(200).json({ success: true, message: "Marked as read", data: n });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to mark as read", error: error.message });
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await Notification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });
    res.status(200).json({ success: true, message: `${result.modifiedCount} notifications marked as read` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to mark all as read", error: error.message });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid notification ID" }); return; }
    const n = await Notification.findByIdAndDelete(id);
    if (!n) { res.status(404).json({ success: false, message: "Notification not found" }); return; }
    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete notification", error: error.message });
  }
};
