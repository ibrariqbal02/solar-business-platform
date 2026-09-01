import apiClient from './client';
import type { ApiResponse, Product } from '../types';

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export const productsApi = {
  getAll: (params?: ProductsQuery) =>
    apiClient.get<ApiResponse<Product[]>>('/products', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/${slug}`),

  create: (data: FormData) =>
    apiClient.post<ApiResponse<Product>>('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Product>>(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/products/${id}`),
};
