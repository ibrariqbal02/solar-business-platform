import axios from 'axios';
import apiClient from './client';
import type { LoginResponse, RefreshResponse, MeResponse } from '../types/auth.types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

// ─── CSRF helper ─────────────────────────────────────────────────────────────
// In production the backend issues a JS-readable `csrf-token` cookie on login.
// Refresh and logout require this value as the `x-csrf-token` header.
// In development verifyCsrf is skipped, so we just send an empty string if the
// cookie is absent.

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * POST /api/auth/login
   * Returns accessToken + admin. Also sets HttpOnly refreshToken + csrf-token cookies.
   */
  login: (email: string, password: string) =>
    axios.post<LoginResponse>(
      `${BASE}/auth/login`,
      { email, password },
      { withCredentials: true },
    ),

  /**
   * POST /api/auth/refresh
   * Uses the HttpOnly refreshToken cookie (sent automatically).
   * Returns a new accessToken. Rotates the refresh cookie.
   * Sends x-csrf-token header (required in production).
   */
  refresh: () =>
    axios.post<RefreshResponse>(
      `${BASE}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'x-csrf-token': getCsrfToken() },
      },
    ),

  /**
   * POST /api/auth/logout
   * Revokes the refresh token in DB and clears the cookie.
   */
  logout: () =>
    apiClient.post<{ success: boolean }>(
      '/auth/logout',
      {},
      { headers: { 'x-csrf-token': getCsrfToken() } },
    ),

  /**
   * GET /api/auth/me
   * Returns the current admin profile. Requires Bearer token (sent by interceptor).
   */
  me: () => apiClient.get<MeResponse>('/auth/me'),

  /**
   * POST /api/auth/change-password
   * Requires Bearer token. Revokes all refresh tokens on success.
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<{ success: boolean; message: string }>(
      '/auth/change-password',
      { currentPassword, newPassword },
    ),
};
