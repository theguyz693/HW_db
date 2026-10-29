// ──────────────────────────────────────────────
// Protected Route — redirects unauthenticated users
// ──────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { FullScreenSpinner } from '@/components/feedback/Spinner.tsx';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Redirects authenticated users away from auth pages */
export function GuestRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
