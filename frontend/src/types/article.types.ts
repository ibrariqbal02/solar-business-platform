// Matches backend/src/models/article.model.ts and article-category.model.ts exactly

export type ArticleStatus = 'draft' | 'published' | 'unpublished';

export interface ArticleCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Related resource stubs (populated by API) ─────────────────────────────────

/** Populated relatedVideos — only selected fields returned */
export interface RelatedVideo {
  _id: string;
  title: string;
  youtubeVideoId: string;
  thumbnail?: string;
  youtubeUrl: string;
}

/** Populated relatedProducts — only selected fields returned */
export interface RelatedProduct {
  _id: string;
  name: string;
  slug: string;
  images: { url: string; publicId: string; altText?: string; isPrimary: boolean }[];
  price: number;
  unit: string;
}

// ── List item (heavy content fields excluded by API) ──────────────────────────

export interface ArticleListItem {
  _id: string;
  title: string;
  slug: string;
  featuredImage?: string;
  excerpt?: string;
  category: ArticleCategory;
  tags: string[];
  status: ArticleStatus;
  publishedAt?: string;
  readTimeMinutes?: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Full article (all fields) ─────────────────────────────────────────────────

export interface Article extends ArticleListItem {
  description?: string;
  technicalExplanation?: string;
  troubleshootingSteps: string[];
  safetyInformation?: string;
  relatedVideos: RelatedVideo[];
  relatedProducts: RelatedProduct[];
}

// ── Query params for GET /api/articles ───────────────────────────────────────

export type ArticleSortKey = 'newest' | 'oldest' | 'published';

export interface ArticlesQuery {
  search?: string;
  category?: string;       // ArticleCategory ObjectId string
  status?: ArticleStatus;  // public side always sends 'published'
  sort?: ArticleSortKey;
  page?: number;
  limit?: number;
}
