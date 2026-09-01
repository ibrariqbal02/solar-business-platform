import { useQuery, useMutation } from '@tanstack/react-query';
import { testimonialsApi } from '../api/testimonials.api';
import type { Testimonial, TestimonialSubmitPayload } from '../types/testimonial.types';
import type { PaginationMeta } from '../types';

// ── Public testimonials list ──────────────────────────────────────────────────

export interface UseTestimonialsResult {
  testimonials: Testimonial[];
  pagination: PaginationMeta | undefined;
}

export function useTestimonials(params?: { page?: number; limit?: number }) {
  return useQuery<UseTestimonialsResult>({
    queryKey: ['testimonials', params?.page ?? 1, params?.limit ?? 10],
    queryFn: async () => {
      const res = await testimonialsApi.getPublic(params);
      return {
        testimonials: res.data.data ?? [],
        pagination:   res.data.pagination,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Submit testimonial mutation ───────────────────────────────────────────────

export function useSubmitTestimonial() {
  return useMutation({
    mutationFn: (payload: TestimonialSubmitPayload) =>
      testimonialsApi.submit(payload),
  });
}
