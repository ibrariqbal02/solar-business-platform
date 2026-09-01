// ─── Generic API response shapes ────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
  error?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price?: number;
  images: string[];
  category?: Category;
  features?: string[];
  specifications?: Record<string, string>;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Services ────────────────────────────────────────────────────────────────

export interface Service {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  icon?: string;
  image?: string;
  features?: string[];
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Articles ────────────────────────────────────────────────────────────────

export interface ArticleCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  category?: ArticleCategory;
  tags?: string[];
  author?: string;
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export interface VideoCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  videoUrl: string;
  thumbnail?: string;
  category?: VideoCategory;
  duration?: number;
  isPublished: boolean;
  isFeatured: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Testimonials ────────────────────────────────────────────────────────────

export interface Testimonial {
  _id: string;
  name: string;
  position?: string;
  company?: string;
  content: string;
  rating: number;
  image?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── FAQs ────────────────────────────────────────────────────────────────────

export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Leads / Enquiries ───────────────────────────────────────────────────────

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  createdAt: string;
  updatedAt: string;
}

export interface ContactEnquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: string;
  updatedAt: string;
}

export interface ProductEnquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  product?: Product;
  message?: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface InstallationEnquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  propertyType?: string;
  message?: string;
  status: 'new' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface Media {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  publicId?: string;
  folder?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Legal Pages ─────────────────────────────────────────────────────────────

export interface LegalPage {
  _id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Website Settings ────────────────────────────────────────────────────────

export interface WebsiteSettings {
  _id: string;
  siteName: string;
  tagline?: string;
  logo?: string;
  favicon?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  updatedAt: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  _id: string;
  event: string;
  page?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  totalProducts: number;
  totalServices: number;
  totalArticles: number;
  totalVideos: number;
  recentLeads: Lead[];
  recentEnquiries: ContactEnquiry[];
}
