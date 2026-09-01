import { useEffect } from 'react';
import { registerAuthAccessors } from './api/client';
import { useAuth } from './hooks/useAuth';
import AppRouter from './routes/AppRouter';

/**
 * App is rendered inside AuthProvider, so we can safely register the auth
 * accessors into the axios client here without circular imports.
 */
export default function App() {
  const { getAccessToken, clearAuth } = useAuth();

  useEffect(() => {
    registerAuthAccessors(getAccessToken, clearAuth);
  }, [getAccessToken, clearAuth]);

  return <AppRouter />;
}
