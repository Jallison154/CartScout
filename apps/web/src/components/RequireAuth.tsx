import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function RequireAuth() {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
