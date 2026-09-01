import { useAuthContext } from '../context/AuthContext';

/**
 * Convenience hook — re-exports everything from AuthContext.
 * Components should use this rather than importing the context directly.
 */
export function useAuth() {
  return useAuthContext();
}
