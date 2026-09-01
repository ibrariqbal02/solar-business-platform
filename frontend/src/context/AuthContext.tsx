import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { ROUTES } from '../lib/constants';
import type { SafeAdmin } from '../types/auth.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  admin: SafeAdmin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (admin: SafeAdmin, token: string) => void;
  /** Update only the access token (used by the axios 401 interceptor) */
  setToken: (token: string) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin]               = useState<SafeAdmin | null>(null);
  const [accessToken, setAccessToken]   = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true); // start true → silent refresh

  // Ref for the axios interceptor (always up-to-date, no stale closures)
  const tokenRef = useRef<string | null>(null);

  const navigate = useNavigate();

  // ── Internal helpers ────────────────────────────────────────────────────

  const _storeToken = useCallback((token: string) => {
    tokenRef.current = token;
    setAccessToken(token);
  }, []);

  const _clear = useCallback(() => {
    tokenRef.current = null;
    setAccessToken(null);
    setAdmin(null);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────

  const setAuth = useCallback((newAdmin: SafeAdmin, token: string) => {
    setAdmin(newAdmin);
    _storeToken(token);
  }, [_storeToken]);

  const clearAuth = useCallback(() => _clear(), [_clear]);

  const getAccessToken = useCallback(() => tokenRef.current, []);

  /**
   * initAuth — called once on app mount.
   * Attempts a silent refresh using the HttpOnly refresh cookie.
   * On success, fetches /me to restore the admin profile.
   * On failure, treats the user as logged out (not an error).
   */
  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const refreshRes = await authApi.refresh();
      const token = refreshRes.data.data.accessToken;
      _storeToken(token);

      // Fetch the admin profile with the fresh access token
      // The interceptor will use tokenRef.current which is already updated
      const meRes = await authApi.me();
      setAdmin(meRes.data.data);
    } catch {
      // No valid session — silently stay logged out
      _clear();
    } finally {
      setIsLoading(false);
    }
  }, [_storeToken, _clear]);

  /**
   * login — validates credentials, stores token + admin in memory.
   * Throws on failure so the Login page can catch and display errors.
   */
  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken: token, admin: adminData } = res.data.data;
    setAuth(adminData, token);
    navigate(ROUTES.adminDashboard, { replace: true });
  }, [setAuth, navigate]);

  /**
   * logout — revokes the server session, clears local state, redirects.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout should succeed locally even if the API call fails
    } finally {
      _clear();
      navigate(ROUTES.adminLogin, { replace: true });
    }
  }, [_clear, navigate]);

  // Keep tokenRef in sync if accessToken state ever changes externally
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  // ── Value ───────────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      accessToken,
      isAuthenticated: !!accessToken,
      isLoading,
      initAuth,
      login,
      logout,
      setAuth,
      clearAuth,
      getAccessToken,
    }),
    [admin, accessToken, isLoading, initAuth, login, logout, setAuth, clearAuth, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}

export { AuthContext };
