import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../layouts/ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { RoleGate } from '../layouts/RoleGate';
import { LoadingScreen } from '../components/layout/LoadingScreen';
import { useAppSelector } from '../hooks/useAppSelector';

// Route-level code splitting: each page becomes its own chunk so the
// initial download is just the shell + auth pages (~200 kB instead of 844 kB).
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TicketsPage = lazy(() => import('../pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const TicketCreatePage = lazy(() => import('../pages/TicketCreatePage').then((m) => ({ default: m.TicketCreatePage })));
const TicketDetailPage = lazy(() => import('../pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })));
const UsersPage = lazy(() => import('../pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('../pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const PermissionsPage = lazy(() => import('../pages/PermissionsPage').then((m) => ({ default: m.PermissionsPage })));
const DepartmentsPage = lazy(() => import('../pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AboutCompanyPage = lazy(() => import('../pages/AboutCompanyPage').then((m) => ({ default: m.AboutCompanyPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const AuditLogsPage = lazy(() => import('../pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function withSuspense(Component: ComponentType) {
  return (
    <Suspense fallback={<LoadingScreen variant="inline" message="Loading page..." subMessage="Preparing your workspace view" />}>
      <Component />
    </Suspense>
  );
}

export function AppRoutes() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/tickets" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={withSuspense(LoginPage)} />
      <Route path="/register" element={withSuspense(RegisterPage)} />
      <Route path="/forgot-password" element={withSuspense(ForgotPasswordPage)} />
      <Route path="/reset-password" element={withSuspense(ResetPasswordPage)} />
      <Route path="/verify-email" element={withSuspense(VerifyEmailPage)} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RoleGate roles={['super_admin', 'admin', 'support_agent']}>{withSuspense(DashboardPage)}</RoleGate>} />
        <Route path="/tickets" element={withSuspense(TicketsPage)} />
        <Route path="/tickets/new" element={withSuspense(TicketCreatePage)} />
        <Route path="/tickets/:id" element={withSuspense(TicketDetailPage)} />
        <Route path="/reports" element={<RoleGate roles={['super_admin', 'admin', 'support_agent']}>{withSuspense(ReportsPage)}</RoleGate>} />
        <Route path="/about-company" element={withSuspense(AboutCompanyPage)} />
        <Route path="/notifications" element={withSuspense(NotificationsPage)} />
        <Route path="/profile" element={withSuspense(ProfilePage)} />
        <Route path="/audit-logs" element={<RoleGate roles={['super_admin']}>{withSuspense(AuditLogsPage)}</RoleGate>} />
        <Route path="/users" element={<RoleGate roles={['super_admin', 'admin']}>{withSuspense(UsersPage)}</RoleGate>} />
        <Route path="/roles" element={<RoleGate roles={['super_admin']}>{withSuspense(RolesPage)}</RoleGate>} />
        <Route path="/permissions" element={<RoleGate roles={['super_admin']}>{withSuspense(PermissionsPage)}</RoleGate>} />
        <Route path="/departments" element={<RoleGate roles={['super_admin', 'admin']}>{withSuspense(DepartmentsPage)}</RoleGate>} />
      </Route>
      <Route path="*" element={withSuspense(NotFoundPage)} />
    </Routes>
  );
}
