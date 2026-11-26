import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminModulePage } from "./pages/AdminModulePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { InvitationPage } from "./pages/InvitationPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import {
  TankDetailsPage,
  TankManagementPage,
} from "./pages/TankManagementPage";
import { DeviceManagementPage } from "./pages/DeviceManagementPage";
import { LanguageProvider } from "./i18n";
import { AlertsPage } from "./pages/AlertsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AlertConfigurationPage } from "./pages/AlertConfigurationPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { PasswordChangePage } from "./pages/PasswordChangePage";
import { ReportsPage } from "./pages/ReportsPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";

const authenticatedRoles = [
  "SUPER_ADMIN",
  "ORGANIZATION_ADMIN",
  "SUB_ADMIN",
  "OPERATOR",
];
const adminRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const adminPaths = [
  "/dashboard/analytics",
  "/organizations",
  "/organizations/new",
  "/organizations/settings",
  "/users",
  "/users/roles",
  "/tanks",
  "/tanks/hardware",
  "/tanks/level",
  "/tanks/status",
  "/tanks/history",
  "/irrigation",
  "/irrigation/valves",
  "/irrigation/schedules",
  "/irrigation/history",
  "/soil-moisture",
  "/soil-moisture/sensors",
  "/soil-moisture/thresholds",
  "/soil-moisture/history",
  "/water-sources",
  "/water-sources/intake",
  "/water-sources/flow",
  "/water-sources/history",
  "/water-quality",
  "/water-quality/history",
  "/water-quality/calibration",
  "/devices",
  "/devices/diagnostics",
  "/schedule",
  "/reports",
  "/alerts/history",
  "/notifications/broadcasts",
  "/notifications/settings",
  "/audit-logs",
  "/settings",
];

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/accept-invitation" element={<InvitationPage />} />
          <Route
            path="/invite"
            element={<Navigate to="/accept-invitation" replace />}
          />
          <Route element={<ProtectedRoute roles={authenticatedRoles} />}>
            <Route path="/home" element={<DashboardPage />} />
            <Route element={<ProtectedRoute roles={adminRoles} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/analytics" element={<DashboardPage />} />
              <Route path="/users/roles" element={<UserManagementPage />} />
              <Route path="/devices/diagnostics" element={<DeviceManagementPage />} />
              <Route path="/alerts/history" element={<AlertsPage />} />
              <Route path="/notifications/broadcasts" element={<NotificationsPage />} />
              <Route path="/notifications/settings" element={<NotificationsPage />} />
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/organizations/new" element={<OrganizationsPage />} />
              <Route path="/organizations/settings" element={<OrganizationsPage />} />
              <Route path="/users/create-admin" element={<UserManagementPage />} />
              <Route path="/tanks/new" element={<TankManagementPage />} />
              <Route path="/devices/register" element={<DeviceManagementPage />} />
              <Route path="/change-password" element={<PasswordChangePage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/alert-settings"
                element={<AlertConfigurationPage />}
              />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/tanks" element={<TankManagementPage />} />
              <Route path="/tanks/:tankId" element={<TankDetailsPage />} />
              <Route path="/devices" element={<DeviceManagementPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {adminPaths
                .filter(
                  (path) =>
                    !["/users", "/tanks", "/devices", "/reports", "/organizations", "/organizations/new", "/organizations/settings", "/users/create-admin", "/users/roles", "/tanks/new", "/devices/register", "/devices/diagnostics", "/dashboard/analytics", "/alerts/history", "/notifications/broadcasts", "/notifications/settings"].includes(path),
                )
                .map((path) => (
                  <Route key={path} path={path} element={<AdminModulePage />} />
                ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}
