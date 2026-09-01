import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Product, ProductListItem, ProductsQuery } from '../types/product.types';

export const productsApi = {
  /**
   * GET /api/products
   * List view — API omits detailedDescription and specifications to keep payload lean.
   */
  getAll: (params?: ProductsQuery) =>
    apiClient.get<ApiResponse<ProductListItem[]>>('/products', { params }),

  /**
   * GET /api/products/slug/:slug  ← note the /slug/ prefix, NOT /:slug
   * Full document including specifications and detailedDescription.
   */
  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/slug/${slug}`),

  /** GET /api/products/id/:id */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/id/${id}`),

  /** GET /api/products/:id/related */
  getRelated: (id: string) =>
    apiClient.get<ApiResponse<ProductListItem[]>>(`/products/${id}/related`),

  /** POST /api/products/:id/view — fire-and-forget view tracking */
  trackView: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/products/${id}/view`),

  // ── Admin ─────────────────────────────────────────────────────────────────

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

  toggleFeatured: (id: string) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}/featured`),

  updateStock: (id: string, stock: number) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}/stock`, { stock }),
};
