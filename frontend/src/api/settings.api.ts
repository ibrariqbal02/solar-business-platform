import apiClient from './client';
import type { ApiResponse, WebsiteSettings } from '../types';

export const settingsApi = {
  get: () =>
    apiClient.get<ApiResponse<WebsiteSettings>>('/settings'),

  update: (data: FormData) =>
    apiClient.put<ApiResponse<WebsiteSettings>>('/settings', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
