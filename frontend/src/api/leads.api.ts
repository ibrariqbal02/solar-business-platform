import apiClient from './client';
import type { ApiResponse, Lead, ContactEnquiry, ProductEnquiry, InstallationEnquiry } from '../types';

export interface LeadsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const leadsApi = {
  getAll: (params?: LeadsQuery) =>
    apiClient.get<ApiResponse<Lead[]>>('/leads', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Lead>>(`/leads/${id}`),

  updateStatus: (id: string, status: Lead['status']) =>
    apiClient.patch<ApiResponse<Lead>>(`/leads/${id}/status`, { status }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/leads/${id}`),

  // Contact enquiries
  getContactEnquiries: (params?: LeadsQuery) =>
    apiClient.get<ApiResponse<ContactEnquiry[]>>('/leads/contact', { params }),

  // Product enquiries
  getProductEnquiries: (params?: LeadsQuery) =>
    apiClient.get<ApiResponse<ProductEnquiry[]>>('/leads/product', { params }),

  // Installation enquiries
  getInstallationEnquiries: (params?: LeadsQuery) =>
    apiClient.get<ApiResponse<InstallationEnquiry[]>>('/leads/installation', { params }),
};
