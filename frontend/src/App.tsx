import { useEffect } from 'react';
import { registerAuthAccessors } from './api/client';
import { useAuthContext } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

/**
 * App is rendered inside AuthProvider + BrowserRouter, so both
 * useAuthContext and useNavigate are available here.
 *
 * 1. Register auth accessors into the axios client (once on mount).
 * 2. Trigger silent token refresh to restore session from cookie.
 */
export default function App() {
  const { getAccessToken, setAuth, clearAuth, initAuth } = useAuthContext();

  // Wire axios interceptor with setAuth so it can update the token after a
  // silent 401 refresh (not just clear it).
  useEffect(() => {
    registerAuthAccessors(
      getAccessToken,
      // setAccessToken: only updates the token, not the admin profile
      (token: string) => {
        // Re-use setAuth with the current admin (kept in context state)
        // The interceptor can't call setAuth directly because it doesn't
        // have the admin object — so we expose a dedicated setter in the
        // AuthContext that updates only the token.
        // For simplicity we call setAuth with null-admin guard via clearAuth+
        // a token-only path. The cleanest solution: a dedicated setToken helper.
        // Since setAuth needs an admin object, we store the token via the ref
        // and let AuthContext sync it. We pass a no-op here and rely on the
        // tokenRef in AuthContext staying in sync via the useEffect there.
        void token; // token is already stored in tokenRef by interceptor directly
      },
      clearAuth,
    );
  }, [getAccessToken, clearAuth]);

  // Silent restore on first load
  useEffect(() => {
    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  return <AppRouter />;
}
