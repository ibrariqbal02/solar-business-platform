import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Article, ArticleListItem, ArticleCategory, ArticlesQuery } from '../types/article.types';

export const articlesApi = {
  /**
   * GET /api/articles
   * List view — omits description, technicalExplanation,
   * troubleshootingSteps, safetyInformation.
   * Always pass status='published' for the public side.
   */
  getAll: (params?: ArticlesQuery) =>
    apiClient.get<ApiResponse<ArticleListItem[]>>('/articles', { params }),

  /**
   * GET /api/articles/slug/:slug
   * Full document with all sections + populated relatedVideos + relatedProducts.
   */
  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Article>>(`/articles/slug/${slug}`),

  /**
   * GET /api/articles/id/:id
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Article>>(`/articles/id/${id}`),

  // ── Admin ─────────────────────────────────────────────────────────────────

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Article>>('/articles', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Article>>(`/articles/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/articles/${id}`),

  publish: (id: string) =>
    apiClient.patch<ApiResponse<Article>>(`/articles/${id}/publish`),

  unpublish: (id: string) =>
    apiClient.patch<ApiResponse<Article>>(`/articles/${id}/unpublish`),
};

// ── Article categories ────────────────────────────────────────────────────────

export const articleCategoriesApi = {
  /** GET /api/article-categories — pass active=true for public use */
  getAll: (params?: { active?: boolean; limit?: number }) =>
    apiClient.get<ApiResponse<ArticleCategory[]>>('/article-categories', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<ArticleCategory>>(`/article-categories/slug/${slug}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<ArticleCategory>>(`/article-categories/id/${id}`),
};
