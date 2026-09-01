import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.api';
import type { WebsiteSettings } from '../types/settings.types';

export function useSettings() {
  return useQuery<WebsiteSettings | undefined>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getPublic();
      return res.data.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min — settings rarely change
    gcTime: 30 * 60 * 1000,
  });
}
