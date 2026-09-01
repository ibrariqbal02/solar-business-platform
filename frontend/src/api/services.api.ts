import apiClient from './client';
import type { ApiResponse, Service } from '../types';

export interface ServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export const servicesApi = {
  getAll: (params?: ServicesQuery) =>
    apiClient.get<ApiResponse<Service[]>>('/services', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Service>>(`/services/${slug}`),

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
};
