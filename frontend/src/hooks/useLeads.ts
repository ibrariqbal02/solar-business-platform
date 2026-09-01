import { useMutation } from '@tanstack/react-query';
import { leadsApi, productEnquiryApi } from '../api/leads.api';
import type { LeadSubmitPayload, ProductEnquiryPayload } from '../types/lead.types';

// ── Generic lead submission ───────────────────────────────────────────────────

export function useSubmitLead() {
  return useMutation({
    mutationFn: (payload: LeadSubmitPayload) => leadsApi.submit(payload),
  });
}

// ── Product enquiry (dedicated endpoint) ─────────────────────────────────────

export function useSubmitProductEnquiry(productId: string) {
  return useMutation({
    mutationFn: (payload: ProductEnquiryPayload) =>
      productEnquiryApi.submit(productId, payload),
  });
}
