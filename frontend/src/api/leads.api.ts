import apiClient from './client';
import type { ApiResponse } from '../types';
import type { LeadSubmitPayload, LeadSubmitResponse, ProductEnquiryPayload } from '../types/lead.types';

export const leadsApi = {
  /**
   * POST /api/leads
   * Accepts: type, customerName, customerPhone, customerWhatsApp?,
   *          customerEmail?, data (flexible per-type object)
   * Required in data:
   *   contact          → data.message
   *   technical_support → data.problem
   *   product_enquiry  → data.productId
   *   others           → no hard server-side requirement beyond type
   */
  submit: (payload: LeadSubmitPayload) =>
    apiClient.post<LeadSubmitResponse>('/leads', payload),
};

export const productEnquiryApi = {
  /**
   * POST /api/products/:id/enquiry
   * Dedicated product enquiry endpoint — creates a ProductEnquiry document
   * and increments product.enquiryCount.
   */
  submit: (productId: string, payload: ProductEnquiryPayload) =>
    apiClient.post<ApiResponse<unknown>>(`/products/${productId}/enquiry`, {
      ...payload,
      channel: payload.channel ?? 'form',
    }),
};
