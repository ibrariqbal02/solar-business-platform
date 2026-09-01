import apiClient from './client';
import type { ApiResponse, PaginationMeta } from '../types';
import type { Product, ProductListItem, ProductsQuery } from '../types/product.types';

// ─── Extended query type for admin (adds active filter) ───────────────────────

export interface AdminProductsQuery extends ProductsQuery {
  /** 'true' = active only (default), 'false' = inactive only, 'all' = both */
  active?: 'true' | 'false' | 'all';
}

export interface ProductsListResponse {
  data: ProductListItem[];
  pagination: PaginationMeta;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const productsApi = {
  // ── Public ──────────────────────────────────────────────────────────────────

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

  /** GET /api/products/id/:id — full document, used by the edit form prefill */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/id/${id}`),

  /** GET /api/products/:id/related */
  getRelated: (id: string) =>
    apiClient.get<ApiResponse<ProductListItem[]>>(`/products/${id}/related`),

  /** POST /api/products/:id/view — fire-and-forget view tracking */
  trackView: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/products/${id}/view`),

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/products — admin variant supports active='false'|'all' to include
   * soft-deleted products in the list.
   */
  adminGetAll: (params?: AdminProductsQuery) =>
    apiClient.get<ApiResponse<ProductListItem[]> & { pagination: PaginationMeta }>(
      '/products',
      { params },
    ),

  /**
   * POST /api/products — multipart/form-data, images[] up to 10 files
   */
  create: (data: FormData) =>
    apiClient.post<ApiResponse<Product>>('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * PUT /api/products/:id — multipart/form-data
   * Pass removeImageIds as JSON-stringified array in the form to delete existing images.
   */
  update: (id: string, data: FormData) =>
    apiClient.put<ApiResponse<Product>>(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/products/:id — soft delete (sets isActive = false) */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/products/${id}`),

  /** PATCH /api/products/:id/restore — re-activate a soft-deleted product */
  restore: (id: string) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}/restore`),

  /**
   * PATCH /api/products/:id/featured
   * Backend expects { isFeatured: boolean } in the body.
   */
  toggleFeatured: (id: string, isFeatured: boolean) =>
    apiClient.patch<ApiResponse<{ _id: string; isFeatured: boolean }>>(
      `/products/${id}/featured`,
      { isFeatured },
    ),

  /**
   * PATCH /api/products/:id/stock
   * Body: { stock: number }  — backend pre-save hook derives stockStatus automatically.
   */
  updateStock: (id: string, stock: number) =>
    apiClient.patch<ApiResponse<{ _id: string; stock: number; stockStatus: string }>>(
      `/products/${id}/stock`,
      { stock },
    ),
};
