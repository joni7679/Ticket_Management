import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { LoadingScreen } from '../components/layout/LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, initialized } = useAppSelector((state) => state.auth);

  if (!initialized) {
    return <LoadingScreen variant="fullscreen" message="Restoring your session..." subMessage="Verifying credentials and loading workspace" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
