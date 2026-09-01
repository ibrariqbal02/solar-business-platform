// Matches backend/src/models/lead.model.ts exactly

export type LeadType =
  | 'product_enquiry'
  | 'technical_support'
  | 'video_call'
  | 'site_visit'
  | 'installation'
  | 'contact';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'in_progress'
  | 'scheduled'
  | 'completed'
  | 'resolved'
  | 'cancelled';

// ── Base fields shared by every lead ─────────────────────────────────────────
export interface LeadBaseFields {
  customerName: string;
  customerPhone: string;
  customerWhatsApp?: string;
  customerEmail?: string;
}

// ── Per-type data payloads ────────────────────────────────────────────────────

export interface ContactData {
  message: string;
}

export interface TechnicalSupportData {
  problem: string;
  productModel?: string;
}

export interface VideoCallData {
  problem: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface SiteVisitData {
  address: string;
  city: string;
  preferredDate?: string;
}

export interface InstallationData {
  address: string;
  city: string;
  propertyType?: string;
  estimatedSystemSize?: string;
}

export interface ProductEnquiryData {
  productId: string;
  productName?: string;
  quantity?: number;
  message?: string;
}

// ── Full submit payload ───────────────────────────────────────────────────────
export interface LeadSubmitPayload extends LeadBaseFields {
  type: LeadType;
  data: Record<string, unknown>;
}

// ── API response shape ────────────────────────────────────────────────────────
export interface LeadSubmitResponse {
  success: boolean;
  message: string;
  data?: { _id: string; type: LeadType };
}

// ── ProductEnquiry (separate model, POST /products/:id/enquiry) ───────────────
export interface ProductEnquiryPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  quantity?: number;
  channel?: 'form' | 'whatsapp' | 'call' | 'email';
}
