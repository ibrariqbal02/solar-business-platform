import apiClient from './client';
import type { ApiResponse, Testimonial } from '../types';

export const testimonialsApi = {
  getAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    apiClient.get<ApiResponse<Testimonial[]>>('/testimonials', { params }),

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Testimonial>>('/testimonials', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Testimonial>>(`/testimonials/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/testimonials/${id}`),
};
