import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../lib/constants';

/**
 * Wraps admin routes. Redirects to the login page if the user is not authenticated.
 * Replace the stub `isAuthenticated` check with real auth state in Phase 4.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.adminLogin} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
