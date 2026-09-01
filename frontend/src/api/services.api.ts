import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Service, ServicesQuery } from '../types/service.types';

export const servicesApi = {
  /**
   * GET /api/services
   * Query params: search, area, active, sort (order|newest|oldest), page, limit
   */
  getAll: (params?: ServicesQuery) =>
    apiClient.get<ApiResponse<Service[]>>('/services', { params }),

  /**
   * GET /api/services/slug/:slug
   */
  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Service>>(`/services/slug/${slug}`),

  /**
   * GET /api/services/id/:id
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Service>>(`/services/id/${id}`),

  // ── Admin ─────────────────────────────────────────────────────────────────

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Service>>('/services', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Service>>(`/services/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/services/${id}`),

  toggleStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiResponse<Service>>(`/services/${id}/status`, { isActive }),
};
