import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ─── Auth accessors (set once from AuthProvider mount) ───────────────────────
// Using module-level functions avoids circular imports between client ↔ context.

let _getAccessToken: (() => string | null) | null = null;
let _clearAuth: (() => void) | null = null;

export function registerAuthAccessors(
  getToken: () => string | null,
  clearAuth: () => void,
) {
  _getAccessToken = getToken;
  _clearAuth = clearAuth;
}

// ─── Axios instance ──────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  withCredentials: true, // send the refresh-token cookie on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach access token ───────────────────────────────

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

// ─── Response interceptor — silent token refresh on 401 ─────────────────────

let isRefreshing = false;
// Queue of { resolve, reject } for requests that arrived during a refresh
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is already in flight — queue this request
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // The refresh token lives in an HttpOnly cookie — no body needed
      const { data } = await axios.post<{ data?: { accessToken?: string }; accessToken?: string }>(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken =
        data?.data?.accessToken ?? (data as { accessToken?: string })?.accessToken ?? '';

      // Let the context know about the new token (if accessors are wired)
      // We only have getAccessToken here; the full setAuth is in AuthProvider.
      // For now we update the in-flight request and queue; the app will sync
      // the token on the next render via AuthProvider's useEffect watcher.
      processQueue(null, newToken);

      if (originalRequest.headers) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed — clear auth and let the router redirect to login
      _clearAuth?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
