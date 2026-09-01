import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import type { Service, ServicesQuery } from '../types/service.types';
import type { PaginationMeta } from '../types';

// ── Service list ──────────────────────────────────────────────────────────────

export interface UseServicesResult {
  services: Service[];
  pagination: PaginationMeta | undefined;
}

export function useServices(params?: ServicesQuery) {
  return useQuery<UseServicesResult>({
    queryKey: [
      'services',
      params?.search ?? '',
      params?.area ?? '',
      params?.active ?? '',
      params?.sort ?? 'order',
      params?.page ?? 1,
      params?.limit ?? 20,
    ],
    queryFn: async () => {
      const res = await servicesApi.getAll(params);
      return {
        services: res.data.data ?? [],
        pagination: res.data.pagination,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ── Single service by slug ────────────────────────────────────────────────────

export function useService(slug: string | undefined) {
  return useQuery<Service | undefined>({
    queryKey: ['service', slug],
    queryFn: async () => {
      if (!slug) return undefined;
      const res = await servicesApi.getBySlug(slug);
      return res.data.data;
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
