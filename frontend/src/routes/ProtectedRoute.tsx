import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { Spinner } from '../components/ui';

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;

  return <Outlet />;
}
