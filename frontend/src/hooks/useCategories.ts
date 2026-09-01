import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories.api';
import type { Category } from '../types/product.types';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.getAll({ limit: 100 });
      return res.data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
