// Matches backend/src/models/service.model.ts exactly

export type ServiceCtaType = 'link' | 'whatsapp' | 'modal';

export interface IServiceCTA {
  label: string;
  url?: string;
  type: ServiceCtaType;
}

export interface Service {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  areas: string[];      // coverage areas e.g. ["Lahore", "Karachi"]
  features: string[];   // key bullet points
  cta: IServiceCTA;
  order: number;        // display order
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Query params for GET /api/services ───────────────────────────────────────

export type ServiceSortKey = 'order' | 'newest' | 'oldest';

export interface ServicesQuery {
  search?: string;
  area?: string;
  active?: boolean;     // maps to query param "active"
  sort?: ServiceSortKey;
  page?: number;
  limit?: number;
}
