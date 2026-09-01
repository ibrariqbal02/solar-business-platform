import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Admin } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setAuth: (admin: Admin, accessToken: string) => void;
  clearAuth: () => void;
  /** Exposed so the axios interceptor can read the latest token without stale closures */
  getAccessToken: () => string | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, _setIsLoading] = useState(false); // setter reserved for async auth init

  // Keep a ref so the axios interceptor always has the latest value
  const tokenRef = useRef<string | null>(null);

  const setAuth = useCallback((newAdmin: Admin, token: string) => {
    setAdmin(newAdmin);
    setAccessToken(token);
    tokenRef.current = token;
  }, []);

  const clearAuth = useCallback(() => {
    setAdmin(null);
    setAccessToken(null);
    tokenRef.current = null;
  }, []);

  const getAccessToken = useCallback(() => tokenRef.current, []);

  // Sync tokenRef whenever accessToken state changes
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      accessToken,
      isAuthenticated: !!accessToken,
      isLoading,
      setAuth,
      clearAuth,
      getAccessToken,
    }),
    [admin, accessToken, isLoading, setAuth, clearAuth, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}

export { AuthContext };
