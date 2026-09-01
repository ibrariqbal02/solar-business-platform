import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ─── Auth accessors (registered by App.tsx after mount) ──────────────────────
// Module-level to avoid circular imports between client ↔ context.

let _getAccessToken: (() => string | null) | null = null;
let _setAccessToken: ((token: string) => void) | null = null;
let _clearAuth: (() => void) | null = null;

export function registerAuthAccessors(
  getToken: () => string | null,
  setToken: (token: string) => void,
  clearAuth: () => void,
) {
  _getAccessToken = getToken;
  _setAccessToken = setToken;
  _clearAuth      = clearAuth;
}

// ─── CSRF helper (mirrors csrf.middleware.ts) ────────────────────────────────

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach Bearer token ───────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = _getAccessToken?.();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — silent 401 refresh ───────────────────────────────

let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token as string);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401s, only once per request
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (original.headers) original.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { data } = await axios.post<{ data?: { accessToken?: string } }>(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { 'x-csrf-token': getCsrfToken() },
        },
      );

      const newToken = data?.data?.accessToken ?? '';

      // Sync the new token into AuthContext so subsequent requests use it
      if (newToken) _setAccessToken?.(newToken);

      processQueue(null, newToken);

      if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      _clearAuth?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
