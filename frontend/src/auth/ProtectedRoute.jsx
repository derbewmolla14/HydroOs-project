import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ roles, serviceType }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return <div className="p-8 text-slate-300">Loading HydroOS...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  const role = user.systemRole || user.role;
  if (roles && !roles.includes(role))
    return <Navigate to="/login" replace state={{ unauthorized: true }} />;
  if (serviceType && role === "OPERATOR") {
    const subscriptionCurrent = user.subscriptionStatus === "active"
      && user.monthlyFeePaid === true
      && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());
    const allowedServices = user.allowedServices || [];
    const hasService = allowedServices.includes(serviceType);
    if (!subscriptionCurrent || !hasService) return <Navigate to="/services" replace state={{ serviceRequired: serviceType }} />;
  }
  return <Outlet />;
}
