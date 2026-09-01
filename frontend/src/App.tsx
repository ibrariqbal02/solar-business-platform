import { useEffect } from 'react';
import { registerAuthAccessors } from './api/client';
import { useAuthContext } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

/**
 * App is rendered inside AuthProvider + BrowserRouter, so both
 * useAuthContext and useNavigate are available here.
 *
 * 1. Register auth accessors into the axios client (once on mount) so the
 *    silent-401-refresh interceptor can read/update the token and clear auth.
 * 2. Trigger initAuth() to attempt a silent token refresh from the
 *    HttpOnly refresh cookie, restoring the session on page load.
 */
export default function App() {
  const { getAccessToken, setToken, clearAuth, initAuth } = useAuthContext();

  useEffect(() => {
    registerAuthAccessors(getAccessToken, setToken, clearAuth);
  }, [getAccessToken, setToken, clearAuth]);

  useEffect(() => {
    void initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return <AppRouter />;
}
