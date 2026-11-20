import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@pos/shared';
import { useAuth } from '../providers/AuthProvider';

export function ProtectedRoute({
  children,
  allowedRole
}: {
  children: ReactNode;
  allowedRole: Role;
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'HQ_ADMIN' ? '/admin' : '/pos'} replace />;
  }

  return <>{children}</>;
}
