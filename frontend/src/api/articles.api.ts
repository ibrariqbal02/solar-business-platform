import apiClient from './client';
import type { ApiResponse, PaginationMeta } from '../types';
import type {
  Article, ArticleListItem, ArticleCategory,
  ArticlesQuery, ArticleStatus,
} from '../types/article.types';

// ─── Extended query types ─────────────────────────────────────────────────────

export interface AdminArticlesQuery {
  search?: string;
  category?: string;
  status?: ArticleStatus;
  sort?: 'newest' | 'oldest' | 'published';
  page?: number;
  limit?: number;
}

export interface AdminArticleCategoriesQuery {
  search?: string;
  active?: 'true' | 'false';
  sort?: 'newest' | 'oldest' | 'name';
  page?: number;
  limit?: number;
}

// ─── Articles API ─────────────────────────────────────────────────────────────

export const articlesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/articles — list (heavy fields excluded)
   * Public side always passes status='published'.
   */
  getAll: (params?: ArticlesQuery) =>
    apiClient.get<ApiResponse<ArticleListItem[]>>('/articles', { params }),

  /** GET /api/articles/slug/:slug — full document */
  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Article>>(`/articles/slug/${slug}`),

  /** GET /api/articles/id/:id — full document */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Article>>(`/articles/id/${id}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/articles — admin variant with full pagination meta.
   * Omit status to see all (draft + published + unpublished).
   */
  adminGetAll: (params?: AdminArticlesQuery) =>
    apiClient.get<ApiResponse<ArticleListItem[]> & { pagination: PaginationMeta }>(
      '/articles',
      { params },
    ),

  /**
   * POST /api/articles — multipart/form-data
   * Fields: title*, category*, excerpt, description, technicalExplanation,
   *         troubleshootingSteps (JSON array), safetyInformation,
   *         relatedVideos (JSON array), relatedProducts (JSON array),
   *         tags (JSON array), status, readTimeMinutes
   * File:   featuredImage (single)
   */
  create: (data: FormData) =>
    apiClient.post<ApiResponse<Article>>('/articles', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PUT /api/articles/:id — multipart/form-data
   * Same fields as create. Pass removeFeaturedImage="true" to clear image.
   */
  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Article>>(`/articles/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/articles/:id — soft delete (sets status = "unpublished") */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/articles/${id}`),

  /**
   * PATCH /api/articles/:id/publish
   * Body: { publishedAt?: ISO date string }
   */
  publish: (id: string) =>
    apiClient.patch<ApiResponse<{ _id: string; status: string; publishedAt: string }>>(
      `/articles/${id}/publish`,
    ),

  /** PATCH /api/articles/:id/unpublish */
  unpublish: (id: string) =>
    apiClient.patch<ApiResponse<{ _id: string; status: string }>>(
      `/articles/${id}/unpublish`,
    ),
};

// ─── Article Categories API ───────────────────────────────────────────────────

export const articleCategoriesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /** GET /api/article-categories */
  getAll: (params?: { active?: boolean; limit?: number }) =>
    apiClient.get<ApiResponse<ArticleCategory[]>>('/article-categories', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<ArticleCategory>>(`/article-categories/slug/${slug}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<ArticleCategory>>(`/article-categories/id/${id}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/article-categories — admin variant with full pagination.
   * Omit active to return all.
   */
  adminGetAll: (params?: AdminArticleCategoriesQuery) =>
    apiClient.get<ApiResponse<ArticleCategory[]> & { pagination: PaginationMeta }>(
      '/article-categories',
      { params },
    ),

  /** POST /api/article-categories — Body (JSON): { name*, description? } */
  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<ArticleCategory>>('/article-categories', data),

  /** PUT /api/article-categories/:id — Body (JSON): { name?, description?, isActive? } */
  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    apiClient.put<ApiResponse<ArticleCategory>>(`/article-categories/${id}`, data),

  /** DELETE /api/article-categories/:id — soft delete */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/article-categories/${id}`),

  /**
   * PATCH /api/article-categories/:id/status
   * Body: { isActive: boolean }
   */
  toggleStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; name: string; isActive: boolean }>>(
      `/article-categories/${id}/status`,
      { isActive },
    ),
};
