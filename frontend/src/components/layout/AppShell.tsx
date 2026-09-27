import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { clearCredentials } from '../../store/authSlice';
import { logoutRequest } from '../../services/auth';
import { toast } from 'sonner';

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('helpdesk-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const role = useAppSelector((state) => state.auth.user?.roleKey);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // logout endpoint is best-effort; still clear local session
    }
    dispatch(clearCredentials());
    toast.success('Logged out');
    navigate('/login');
  };

  useEffect(() => {
    try {
      window.localStorage.setItem('helpdesk-sidebar-collapsed', String(sidebarCollapsed));
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        collapsed={sidebarCollapsed}
        onLogout={handleLogout}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          onMenuClick={() => setMobileMenuOpen((value) => !value)}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 z-40 h-full lg:hidden">
            <Sidebar role={role} mobile onLogout={handleLogout} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
