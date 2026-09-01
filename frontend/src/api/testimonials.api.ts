import apiClient from './client';
import type { ApiResponse } from '../types';
import type { Testimonial, TestimonialSubmitPayload } from '../types/testimonial.types';

export const testimonialsApi = {
  /**
   * GET /api/testimonials
   * Returns only approved + visible testimonials.
   */
  getPublic: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<Testimonial[]>>('/testimonials', { params }),

  /**
   * POST /api/testimonials — multipart/form-data
   * Submitted testimonials land in status="pending" until admin approves.
   */
  submit: (payload: TestimonialSubmitPayload) => {
    const form = new FormData();
    form.append('customerName', payload.customerName);
    if (payload.customerLocation) form.append('customerLocation', payload.customerLocation);
    form.append('review', payload.review);
    form.append('rating', String(payload.rating));
    if (payload.relatedService)  form.append('relatedService', payload.relatedService);
    if (payload.relatedProduct)  form.append('relatedProduct', payload.relatedProduct);
    if (payload.customerImage)   form.append('customerImage', payload.customerImage);

    return apiClient.post<ApiResponse<Testimonial>>('/testimonials', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
