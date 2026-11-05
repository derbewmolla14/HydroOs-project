import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminModulePage } from './pages/AdminModulePage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { InvitationPage } from './pages/InvitationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TankDetailsPage, TankManagementPage } from './pages/TankManagementPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { LanguageProvider } from './i18n';
import { AlertsPage } from './pages/AlertsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AlertConfigurationPage } from './pages/AlertConfigurationPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { PasswordChangePage } from './pages/PasswordChangePage';
import { ReportsPage } from './pages/ReportsPage';

const adminRoles = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'];
const adminPaths = ['/organizations', '/users', '/tanks', '/irrigation', '/soil-moisture', '/water-sources', '/devices', '/schedule', '/reports', '/audit-logs', '/settings'];

export function App() {
    return <LanguageProvider><AuthProvider><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/accept-invitation" element={<InvitationPage />} />
        <Route path="/invite" element={<Navigate to="/accept-invitation" replace />} />
        <Route element={<ProtectedRoute roles={adminRoles} />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/change-password" element={<PasswordChangePage />} /><Route path="/alerts" element={<AlertsPage />} /><Route path="/notifications" element={<NotificationsPage />} /><Route path="/alert-settings" element={<AlertConfigurationPage />} /><Route path="/users" element={<UserManagementPage />} /><Route path="/tanks" element={<TankManagementPage />} /><Route path="/tanks/:tankId" element={<TankDetailsPage />} /><Route path="/devices" element={<DeviceManagementPage />} /><Route path="/reports" element={<ReportsPage />} />{adminPaths.filter((path) => !['/users', '/tanks', '/devices', '/reports'].includes(path)).map((path) => <Route key={path} path={path} element={<AdminModulePage />} />)}</Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></AuthProvider></LanguageProvider>;
}
