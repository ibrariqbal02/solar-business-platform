import apiClient from './client';
import type { ApiResponse, PaginationMeta } from '../types';
import type { Category } from '../types/product.types';

// ─── Query types ──────────────────────────────────────────────────────────────

export interface CategoriesQuery {
  search?: string;
  /** 'true' = active only (default public), 'false' = inactive only, omit = all */
  active?: 'true' | 'false';
  page?: number;
  limit?: number;
  sort?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const categoriesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /** GET /api/categories — public, server-cached */
  getAll: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Category[]>>('/categories', { params }),

  /** GET /api/categories/:identifier — by _id or slug */
  getOne: (identifier: string) =>
    apiClient.get<ApiResponse<Category>>(`/categories/${identifier}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/categories — admin variant supporting active filter + full pagination.
   * Omitting 'active' returns ALL categories (active and inactive).
   */
  adminGetAll: (params?: CategoriesQuery) =>
    apiClient.get<ApiResponse<Category[]> & { pagination: PaginationMeta }>(
      '/categories',
      { params },
    ),

  /**
   * GET /api/categories/:identifier — by _id or slug.
   * Used to prefill the edit form (same endpoint as getOne, aliased for clarity).
   */
  getById: (identifier: string) =>
    apiClient.get<ApiResponse<Category>>(`/categories/${identifier}`),

  /**
   * POST /api/categories — multipart/form-data
   * Fields: name (required), description (optional)
   * File:   image (optional, field name "image")
   */
  create: (data: FormData) =>
    apiClient.post<ApiResponse<Category>>('/categories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PUT /api/categories/:id — multipart/form-data
   * Fields: name, description, isActive, removeImage ("true" to clear)
   * File:   image (optional, replaces existing)
   */
  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/categories/:id — soft delete (sets isActive = false) */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/categories/${id}`),

  /** PATCH /api/categories/:id/restore — re-activates a soft-deleted category */
  restore: (id: string) =>
    apiClient.patch<ApiResponse<Category>>(`/categories/${id}/restore`),
};
