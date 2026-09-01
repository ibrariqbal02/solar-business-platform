import apiClient from './client';

// ── Search result item shapes (what the backend selects) ─────────────────────

export interface SearchProduct {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  images: { url: string; publicId: string; altText?: string; isPrimary: boolean }[];
  price: number;
  unit: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface SearchService {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  image?: string;
}

export interface SearchVideo {
  _id: string;
  title: string;
  youtubeVideoId: string;
  thumbnail?: string;
  youtubeUrl: string;
}

export interface SearchArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: string;
}

export interface SearchFAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SearchResults {
  query: string;
  totalResults: number;
  results: {
    products:  SearchProduct[];
    services:  SearchService[];
    videos:    SearchVideo[];
    articles:  SearchArticle[];
    faqs:      SearchFAQ[];
  };
}

export interface SearchResponse {
  success: boolean;
  data: SearchResults;
}

export const searchApi = {
  /**
   * GET /api/search?q=...
   * Returns grouped results across products, services, videos, articles, FAQs.
   */
  global: (query: string, limit = 5) =>
    apiClient.get<SearchResponse>('/search', {
      params: { q: query, limit },
    }),
};
