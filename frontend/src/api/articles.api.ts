import apiClient from './client';
import type { ApiResponse, Article } from '../types';

export interface ArticlesQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

export const articlesApi = {
  getAll: (params?: ArticlesQuery) =>
    apiClient.get<ApiResponse<Article[]>>('/articles', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Article>>(`/articles/${slug}`),

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
};
