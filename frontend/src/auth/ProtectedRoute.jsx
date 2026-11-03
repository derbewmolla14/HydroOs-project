import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ roles }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <div className="p-8 text-slate-300">Loading HydroOS...</div>;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace state={{ unauthorized: true }} />;
    return <Outlet />;
}
