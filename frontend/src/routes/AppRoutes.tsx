import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../layouts/ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { RoleGate } from '../layouts/RoleGate';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TicketsPage } from '../pages/TicketsPage';
import { TicketCreatePage } from '../pages/TicketCreatePage';
import { TicketDetailPage } from '../pages/TicketDetailPage';
import { UsersPage } from '../pages/UsersPage';
import { RolesPage } from '../pages/RolesPage';
import { PermissionsPage } from '../pages/PermissionsPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AboutCompanyPage } from '../pages/AboutCompanyPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useAppSelector } from '../hooks/useAppSelector';

export function AppRoutes() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/tickets" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RoleGate roles={['super_admin', 'admin', 'support_agent']}><DashboardPage /></RoleGate>} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/reports" element={<RoleGate roles={['super_admin', 'admin', 'support_agent']}><ReportsPage /></RoleGate>} />
        <Route path="/about-company" element={<AboutCompanyPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/audit-logs" element={<RoleGate roles={['super_admin']}><AuditLogsPage /></RoleGate>} />
        <Route path="/users" element={<RoleGate roles={['super_admin', 'admin']}><UsersPage /></RoleGate>} />
        <Route path="/roles" element={<RoleGate roles={['super_admin']}><RolesPage /></RoleGate>} />
        <Route path="/permissions" element={<RoleGate roles={['super_admin']}><PermissionsPage /></RoleGate>} />
        <Route path="/departments" element={<RoleGate roles={['super_admin', 'admin']}><DepartmentsPage /></RoleGate>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
