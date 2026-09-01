import apiClient from './client';
import type { ApiResponse } from '../types';
import type { WebsiteSettings } from '../types/settings.types';

export const settingsApi = {
  /** GET /api/settings — public, strips analytics/cloudinary IDs */
  getPublic: () =>
    apiClient.get<ApiResponse<WebsiteSettings>>('/settings'),

  /** GET /api/settings/admin — full document, requires auth */
  getAdmin: () =>
    apiClient.get<ApiResponse<WebsiteSettings>>('/settings/admin'),

  /** PUT /api/settings — upsert singleton, multipart for logo/favicon */
  update: (data: FormData) =>
    apiClient.put<ApiResponse<WebsiteSettings>>('/settings', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
