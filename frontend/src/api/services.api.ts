import apiClient from './client';
import type { ApiResponse, PaginationMeta } from '../types';
import type { Service, ServicesQuery } from '../types/service.types';

// ─── Extended query type for admin ────────────────────────────────────────────

export interface AdminServicesQuery {
  search?: string;
  area?: string;
  /** 'true' = active only, 'false' = inactive only, omit = all */
  active?: 'true' | 'false';
  sort?: 'order' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const servicesApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/services
   * Query params: search, area, active, sort (order|newest|oldest), page, limit
   */
  getAll: (params?: ServicesQuery) =>
    apiClient.get<ApiResponse<Service[]>>('/services', { params }),

  /** GET /api/services/slug/:slug */
  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Service>>(`/services/slug/${slug}`),

  /** GET /api/services/id/:id */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Service>>(`/services/id/${id}`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/services — admin variant with active filter + full pagination meta.
   * Omitting 'active' returns all (active and inactive).
   */
  adminGetAll: (params?: AdminServicesQuery) =>
    apiClient.get<ApiResponse<Service[]> & { pagination: PaginationMeta }>(
      '/services',
      { params },
    ),

  /**
   * POST /api/services — multipart/form-data
   * Fields: name*, shortDescription, description, areas (JSON), features (JSON),
   *         cta (JSON: { label, url?, type }), order
   * File:   image (single, field name "image")
   */
  create: (data: FormData) =>
    apiClient.post<ApiResponse<Service>>('/services', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PUT /api/services/:id — multipart/form-data
   * All fields optional. Pass removeImage="true" to clear current image.
   */
  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Service>>(`/services/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/services/:id — soft delete (sets isActive = false) */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/services/${id}`),

  /**
   * PATCH /api/services/:id/status
   * Body: { isActive: boolean }
   */
  toggleStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; name: string; isActive: boolean }>>(
      `/services/${id}/status`,
      { isActive },
    ),
};
