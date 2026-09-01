import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../lib/constants';

/**
 * Guards all admin routes.
 *
 * - While the silent token refresh is in progress (isLoading = true), render a
 *   full-page spinner so we don't flash-redirect an authenticated user to login.
 * - Once loading is done, redirect unauthenticated visitors to /admin/login,
 *   preserving the attempted URL in location state so we can redirect back
 *   after a successful login.
 * - Authenticated users get the nested route tree via <Outlet />.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        role="status"
        aria-label="Loading"
      >
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.adminLogin} state={{ from: location }} replace />
    );
  }

  return <Outlet />;
}
