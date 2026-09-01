import { Request, Response } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import Lead from "../models/lead.model.js";
import Notification from "../models/notification.model.js";
import WebsiteSettings from "../models/website-settings.model.js";
import { sendEmail } from "../config/email.js";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const LEAD_TYPES = ["product_enquiry", "technical_support", "video_call", "site_visit", "installation", "contact"] as const;
const LEAD_STATUSES = ["new", "contacted", "in_progress", "scheduled", "completed", "resolved", "cancelled"] as const;

// Notification titles per lead type
const notificationTitles: Record<string, string> = {
  product_enquiry:   "New Product Enquiry",
  technical_support: "New Technical Support Request",
  video_call:        "New Video Call Request",
  site_visit:        "New Site Visit Request",
  installation:      "New Installation Enquiry",
  contact:           "New Contact Message",
};

// Helper: create a notification for a new lead (non-blocking)
const createLeadNotification = (leadId: mongoose.Types.ObjectId, type: string, customerName: string) => {
  Notification.create({
    title:       notificationTitles[type] ?? "New Enquiry",
    message:     `New ${type.replace(/_/g, " ")} from ${customerName}`,
    type:        type as any,
    relatedLead: leadId,
  }).catch(() => {});
};

// Helper: email the business owner about a new lead (non-blocking, best-effort)
const notifyOwnerByEmail = (type: string, customerName: string, customerPhone: string) => {
  WebsiteSettings.findOne().select("email businessName").lean().then((settings) => {
    const ownerEmail   = settings?.email;
    const businessName = settings?.businessName ?? "Solar Business Platform";
    if (!ownerEmail) return;   // no owner email configured — skip silently

    const readableType = type.replace(/_/g, " ");
    const subject = `New ${readableType} — ${businessName}`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#f59e0b;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">☀️ ${businessName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">New ${readableType}</h2>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:40%;">Lead Type</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:14px;font-weight:600;">${readableType}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Customer Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:14px;font-weight:600;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#6b7280;font-size:14px;">Phone</td>
                <td style="padding:10px 0;color:#1f2937;font-size:14px;font-weight:600;">${customerPhone}</td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
              Log in to your admin dashboard to view full details and update the lead status.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              This is an automated notification from ${businessName}.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `New ${readableType} — ${businessName}\n\nLead Type: ${readableType}\nCustomer Name: ${customerName}\nPhone: ${customerPhone}\n\nLog in to your dashboard to view details.`;

    sendEmail({ to: ownerEmail, subject, html, text }).then((ok) => {
      if (!ok) console.error("[Lead] Owner notification email failed for lead type:", type);
    });
  }).catch(() => {});
};

// ─── PUBLIC: Submit lead ──────────────────────────────────────────────────────
/**
 * POST /api/leads
 * Body: { type, customerName, customerPhone, customerWhatsApp?, customerEmail?, data: {} }
 * The `data` field is a flexible object per lead type — validated per type below.
 */
export const submitLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, customerName, customerPhone, customerWhatsApp, customerEmail, data } = req.body;

    // Core validation
    if (!type || !LEAD_TYPES.includes(type)) {
      res.status(400).json({ success: false, message: `type must be one of: ${LEAD_TYPES.join(", ")}` }); return;
    }
    if (!customerName?.trim()) { res.status(400).json({ success: false, message: "Customer name is required" }); return; }
    if (!customerPhone?.trim()) { res.status(400).json({ success: false, message: "Phone number is required" }); return; }

    // Per-type data validation
    const payload = (typeof data === "object" && data !== null) ? data as Record<string, unknown> : {};

    if (type === "product_enquiry" && !payload.productId) {
      res.status(400).json({ success: false, message: "productId is required for product enquiries" }); return;
    }
    if (type === "technical_support" && !payload.problem) {
      res.status(400).json({ success: false, message: "problem description is required for technical support" }); return;
    }
    if (type === "contact" && !payload.message) {
      res.status(400).json({ success: false, message: "message is required for contact enquiries" }); return;
    }

    const lead = await Lead.create({
      type,
      customerName:     customerName.trim(),
      customerPhone:    customerPhone.trim(),
      customerWhatsApp: customerWhatsApp?.trim(),
      customerEmail:    customerEmail?.trim().toLowerCase(),
      data:             payload,
    });

    createLeadNotification(lead._id as mongoose.Types.ObjectId, type, customerName.trim());
    notifyOwnerByEmail(type, customerName.trim(), customerPhone.trim());

    res.status(201).json({ success: true, message: "Enquiry submitted successfully", data: { _id: lead._id, type: lead.type } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to submit enquiry", error: error.message });
  }
};

// ─── ADMIN: Get all leads ─────────────────────────────────────────────────────
// GET /api/leads?type=&status=&search=&page=&limit=
export const getAllLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.type   && LEAD_TYPES.includes(req.query.type as any))   filter.type   = req.query.type;
    if (req.query.status && LEAD_STATUSES.includes(req.query.status as any)) filter.status = req.query.status;
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { customerName:  { $regex: escaped, $options: "i" } },
        { customerPhone: { $regex: escaped, $options: "i" } },
        { customerEmail: { $regex: escaped, $options: "i" } },
      ];
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true, data: leads,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch leads", error: error.message });
  }
};

// ─── ADMIN: Get one ───────────────────────────────────────────────────────────
export const getLeadById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid lead ID" }); return; }
    const lead = await Lead.findById(id);
    if (!lead) { res.status(404).json({ success: false, message: "Lead not found" }); return; }
    res.status(200).json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch lead", error: error.message });
  }
};

// ─── ADMIN: Update lead status / note ────────────────────────────────────────
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid lead ID" }); return; }

    const lead = await Lead.findById(id);
    if (!lead) { res.status(404).json({ success: false, message: "Lead not found" }); return; }

    const { status, adminNote } = req.body;
    if (status !== undefined) {
      if (!LEAD_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: `status must be one of: ${LEAD_STATUSES.join(", ")}` }); return;
      }
      lead.status = status;
    }
    if (adminNote !== undefined) lead.adminNote = adminNote?.trim();

    await lead.save();
    res.status(200).json({ success: true, message: "Lead updated", data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update lead", error: error.message });
  }
};

// ─── ADMIN: Delete lead ───────────────────────────────────────────────────────
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) { res.status(400).json({ success: false, message: "Invalid lead ID" }); return; }
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) { res.status(404).json({ success: false, message: "Lead not found" }); return; }
    res.status(200).json({ success: true, message: "Lead deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete lead", error: error.message });
  }
};

// ─── Rate limiter for public submission (exported for use in router) ──────────
export const leadSubmitLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  limit:           process.env.NODE_ENV === "production" ? 5 : 30,
  standardHeaders: "draft-8",
  legacyHeaders:   false,
  message:         { success: false, message: "Too many submissions. Please try again later." },
});
