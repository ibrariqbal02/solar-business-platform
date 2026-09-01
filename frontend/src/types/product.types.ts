// Matches backend/src/models/product.model.ts and category.model.ts exactly.

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type ProductSortKey =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'featured'
  | 'views';

// ── Category (populated inside product responses) ─────────────────────────────

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Sub-documents ─────────────────────────────────────────────────────────────

export interface ProductImage {
  url: string;
  publicId: string;
  altText?: string;
  isPrimary: boolean;
}

export interface Specification {
  label: string;
  value: string;
}

// ── List item (detailedDescription + specifications excluded by API) ───────────

export interface ProductListItem {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  category: Category;
  price: number;
  discountedPrice?: number;
  unit: string;
  images: ProductImage[];
  features: string[];
  applications: string[];
  stock: number;
  stockStatus: StockStatus;
  isAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  viewCount: number;
  enquiryCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Full detail (all fields) ──────────────────────────────────────────────────

export interface Product extends ProductListItem {
  detailedDescription?: string;
  specifications: Specification[];
}

// ── Query params for GET /api/products ───────────────────────────────────────

export interface ProductsQuery {
  search?: string;
  category?: string;    // Category ObjectId string
  isAvailable?: boolean;
  stockStatus?: StockStatus;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSortKey;
  page?: number;
  limit?: number;
}
