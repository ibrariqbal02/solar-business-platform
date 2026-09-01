// Matches backend/src/models/testimonial.model.ts exactly

export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  _id: string;
  customerName: string;
  customerImage?: string;
  customerLocation?: string;
  review: string;
  rating: number;           // 1–5
  relatedProduct?: { _id: string; name: string; slug: string };
  relatedService?: string;  // free-text service name
  isVisible: boolean;
  status: TestimonialStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Submit payload (multipart/form-data) ─────────────────────────────────────
export interface TestimonialSubmitPayload {
  customerName: string;
  customerLocation?: string;
  review: string;
  rating: number;
  relatedService?: string;
  relatedProduct?: string;  // ObjectId string
  customerImage?: File;
}
