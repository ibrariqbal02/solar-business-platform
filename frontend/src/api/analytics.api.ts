import apiClient from './client';
import type { ApiResponse, DashboardStats, AnalyticsEvent } from '../types';

export const analyticsApi = {
  getDashboardStats: () =>
    apiClient.get<ApiResponse<DashboardStats>>('/analytics/dashboard'),

  getEvents: (params?: { page?: number; limit?: number; event?: string }) =>
    apiClient.get<ApiResponse<AnalyticsEvent[]>>('/analytics/events', { params }),

  trackEvent: (event: string, metadata?: Record<string, unknown>) =>
    apiClient.post<ApiResponse<void>>('/analytics/track', { event, metadata }),
};
