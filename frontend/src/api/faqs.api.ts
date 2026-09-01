import apiClient from './client';
import type { ActiveFAQsResponse, FAQCategory } from '../types/faq.types';

export const faqsApi = {
  /**
   * GET /api/faqs/active
   * Returns all active FAQs sorted by category + order.
   * Response: { success, count, data: FAQ[] }  (no pagination object)
   */
  getActive: (category?: FAQCategory) =>
    apiClient.get<ActiveFAQsResponse>('/faqs/active', {
      params: category ? { category } : undefined,
    }),
};
