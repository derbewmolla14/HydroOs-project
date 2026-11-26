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
import { ReportsPage } from "./pages/ReportsPage";\nimport { OrganizationsPage } from "./pages/OrganizationsPage";

const authenticatedRoles = [
  "SUPER_ADMIN",
  "ORGANIZATION_ADMIN",
  "SUB_ADMIN",
  "OPERATOR",
];
const adminRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const adminPaths = [
  "/dashboard/analytics",\n  "/organizations",\n  "/organizations/new",\n  "/organizations/settings",
  "/users",\n  "/users/roles",
  "/tanks",\n  "/tanks/hardware",
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
  "/water-sources",\n  "/water-sources/intake",\n  "/water-sources/flow",\n  "/water-sources/history",
  "/water-quality",
  "/water-quality/history",\n  "/water-quality/calibration",
  "/devices",\n  "/devices/diagnostics",
  "/schedule",
  "/reports",
  "/alerts/history",\n  "/notifications/broadcasts",\n  "/notifications/settings",\n  "/audit-logs",
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
              <Route path="/dashboard" element={<DashboardPage />} />\n              <Route path="/organizations" element={<OrganizationsPage />} />\n              <Route path="/organizations/new" element={<OrganizationsPage />} />\n              <Route path="/organizations/settings" element={<OrganizationsPage />} />\n              <Route path="/users/create-admin" element={<UserManagementPage />} />\n              <Route path="/tanks/new" element={<TankManagementPage />} />\n              <Route path="/devices/register" element={<DeviceManagementPage />} />
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
                    !["/users", "/tanks", "/devices", "/reports", "/organizations", "/organizations/new", "/organizations/settings", "/users/create-admin", "/tanks/new", "/devices/register"].includes(path),
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
