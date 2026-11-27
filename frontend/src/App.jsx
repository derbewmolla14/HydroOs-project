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
import { ServiceManagementPage } from "./pages/ServiceManagementPage";

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
            <Route element={<ProtectedRoute roles={["SUPER_ADMIN", "OPERATOR"]} />}>
              <Route path="/services" element={<ServiceManagementPage />} />
            </Route>
            <Route element={<ProtectedRoute serviceType="water_tank" />}>
              <Route path="/tanks" element={<TankManagementPage />} />
              <Route path="/tanks/:tankId" element={<TankDetailsPage />} />
              <Route path="/tanks/level" element={<AdminModulePage />} />
              <Route path="/tanks/hardware" element={<AdminModulePage />} />
              <Route path="/tanks/status" element={<AdminModulePage />} />
              <Route path="/tanks/history" element={<AdminModulePage />} />
            </Route>
            <Route element={<ProtectedRoute serviceType="irrigation" />}>
              <Route path="/irrigation" element={<AdminModulePage />} />
              <Route path="/irrigation/valves" element={<AdminModulePage />} />
              <Route path="/irrigation/schedules" element={<AdminModulePage />} />
              <Route path="/irrigation/history" element={<AdminModulePage />} />
            </Route>
            <Route element={<ProtectedRoute serviceType="soil_moisture" />}>
              <Route path="/soil-moisture" element={<AdminModulePage />} />
              <Route path="/soil-moisture/sensors" element={<AdminModulePage />} />
              <Route path="/soil-moisture/thresholds" element={<AdminModulePage />} />
              <Route path="/soil-moisture/history" element={<AdminModulePage />} />
            </Route>
            <Route element={<ProtectedRoute serviceType="water_source" />}>
              <Route path="/water-sources" element={<AdminModulePage />} />
              <Route path="/water-sources/intake" element={<AdminModulePage />} />
              <Route path="/water-sources/flow" element={<AdminModulePage />} />
              <Route path="/water-sources/history" element={<AdminModulePage />} />
            </Route>
            <Route path="/field-assessment" element={<AdminModulePage />} />
            <Route path="/field-assessment/submitted" element={<AdminModulePage />} />
            <Route path="/water-quality/map" element={<AdminModulePage />} />
            <Route element={<ProtectedRoute serviceType="water_quality" />}>
              <Route path="/water-quality" element={<AdminModulePage />} />
              <Route path="/water-quality/history" element={<AdminModulePage />} />
              <Route path="/water-quality/calibration" element={<AdminModulePage />} />
            </Route>
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
