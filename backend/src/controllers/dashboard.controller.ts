import { Request, Response } from "express";
import Product from "../models/product.model.js";
import Lead from "../models/lead.model.js";
import Notification from "../models/notification.model.js";
import Testimonial from "../models/testimonial.model.js";
import Article from "../models/article.model.js";

// GET /api/dashboard
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalProducts,
      availableProducts,
      productEnquiries,
      technicalSupport,
      videoCalls,
      siteVisits,
      installations,
      contactMessages,
      pendingTestimonials,
      publishedArticles,
      unreadNotifications,
      recentLeads,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, isAvailable: true }),
      Lead.countDocuments({ type: "product_enquiry" }),
      Lead.countDocuments({ type: "technical_support" }),
      Lead.countDocuments({ type: "video_call" }),
      Lead.countDocuments({ type: "site_visit" }),
      Lead.countDocuments({ type: "installation" }),
      Lead.countDocuments({ type: "contact" }),
      Testimonial.countDocuments({ status: "pending" }),
      Article.countDocuments({ status: "published" }),
      Notification.countDocuments({ isRead: false }),
      Lead.find().sort({ createdAt: -1 }).limit(10).select("type status customerName createdAt"),
    ]);

    // New leads in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newLeadsThisWeek = await Lead.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.status(200).json({
      success: true,
      data: {
        products: { total: totalProducts, available: availableProducts },
        leads: {
          productEnquiries,
          technicalSupport,
          videoCalls,
          siteVisits,
          installations,
          contactMessages,
          newThisWeek: newLeadsThisWeek,
          total: productEnquiries + technicalSupport + videoCalls + siteVisits + installations + contactMessages,
        },
        content: { publishedArticles, pendingTestimonials },
        notifications: { unread: unreadNotifications },
        recentLeads,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch dashboard stats", error: error.message });
  }
};
