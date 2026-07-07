import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NotAuthorized } from '../components/StateViews';

// Route guard: unauthenticated -> /login (remember where we were going);
// authenticated-but-not-a-payer -> an honest "not authorized" screen.
export function RequirePayer({ children }: { children: ReactNode }) {
  const { isAuthenticated, isPayer } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isPayer) {
    return <NotAuthorized />;
  }
  return <>{children}</>;
}
