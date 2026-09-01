import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Category } from '../types/product.types';

export const categoriesApi = {
  /** GET /api/categories — public, server-cached */
  getAll: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Category[]>>('/categories', { params }),

  /** GET /api/categories/:identifier — by _id or slug */
  getOne: (identifier: string) =>
    apiClient.get<ApiResponse<Category>>(`/categories/${identifier}`),
};
