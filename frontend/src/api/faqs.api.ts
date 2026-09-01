import apiClient from './client';
import type { ApiResponse, FAQ } from '../types';

export const faqsApi = {
  getAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    apiClient.get<ApiResponse<FAQ[]>>('/faqs', { params }),

  create: (data: Partial<FAQ>) =>
    apiClient.post<ApiResponse<FAQ>>('/faqs', data),

  update: (id: string, data: Partial<FAQ>) =>
    apiClient.put<ApiResponse<FAQ>>(`/faqs/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/faqs/${id}`),
};
