import { useQuery } from '@tanstack/react-query';
import { faqsApi } from '../api/faqs.api';
import type { FAQ } from '../types/faq.types';

export function useFAQs() {
  return useQuery<FAQ[]>({
    queryKey: ['faqs-active'],
    queryFn: async () => {
      const res = await faqsApi.getActive();
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,  // FAQs change infrequently
    gcTime: 30 * 60 * 1000,
  });
}
