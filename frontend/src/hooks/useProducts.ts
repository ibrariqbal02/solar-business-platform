import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api/products.api';
import type { PaginationMeta } from '../types';
import type { Product, ProductListItem, ProductsQuery } from '../types/product.types';

// ── Paginated list ────────────────────────────────────────────────────────────

export interface UseProductsResult {
  products: ProductListItem[];
  pagination: PaginationMeta | undefined;
}

export function useProducts(params?: ProductsQuery) {
  return useQuery<UseProductsResult>({
    queryKey: [
      'products',
      params?.search ?? '',
      params?.category ?? '',
      params?.isAvailable ?? '',
      params?.stockStatus ?? '',
      params?.isFeatured ?? '',
      params?.minPrice ?? '',
      params?.maxPrice ?? '',
      params?.sort ?? 'newest',
      params?.page ?? 1,
      params?.limit ?? 12,
    ],
    queryFn: async () => {
      const res = await productsApi.getAll(params);
      return {
        products: res.data.data ?? [],
        pagination: res.data.pagination,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev, // keep previous page visible while fetching
  });
}

// ── Single product by slug ────────────────────────────────────────────────────

export function useProduct(slug: string | undefined) {
  return useQuery<Product | undefined>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) return undefined;
      const res = await productsApi.getBySlug(slug);
      return res.data.data;
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
