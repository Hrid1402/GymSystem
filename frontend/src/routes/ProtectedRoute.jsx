import { Navigate, Outlet } from 'react-router-dom';
import { PATHS } from './paths';

/**
 * ProtectedRoute Component (Placeholder for future team auth integration)
 * Wraps routes that will require authentication once auth context is enabled.
 */
export default function ProtectedRoute() {
  // TODO: Replace with real authentication state check when login feature is ready
  const isAuthenticated = true; // Set to true by default so beginners can view pages easily

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  return <Outlet />;
}
