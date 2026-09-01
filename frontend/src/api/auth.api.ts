import apiClient from './client';
import type { ApiResponse, Admin, AuthTokens, LoginPayload } from '../types';

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<Admin & AuthTokens>>('/auth/login', payload),

  logout: () =>
    apiClient.post<ApiResponse<void>>('/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh'),

  me: () =>
    apiClient.get<ApiResponse<Admin>>('/auth/me'),
};
