import { Archive, BarChart3, Boxes, Building2, FileText, LayoutDashboard, Lock, LogOut, Shield, Ticket, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';
import type { RoleKey } from '../../types/auth';
import AplosLogo from './AplosLogo';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'support_agent'] as RoleKey[] },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'admin', 'support_agent'] as RoleKey[] },
  { to: '/about-company', label: 'About Company', icon: Building2 },
  { to: '/profile', label: 'Profile', icon: FileText },
  { to: '/users', label: 'Users', icon: Users, roles: ['super_admin', 'admin'] as RoleKey[] },
  { to: '/roles', label: 'Roles', icon: Shield, roles: ['super_admin'] as RoleKey[] },
  { to: '/permissions', label: 'Permissions', icon: Lock, roles: ['super_admin'] as RoleKey[] },
  { to: '/departments', label: 'Departments', icon: Boxes, roles: ['super_admin', 'admin'] as RoleKey[] },
  { to: '/audit-logs', label: 'Audit Logs', icon: Archive, roles: ['super_admin'] as RoleKey[] }
];

export function Sidebar({
  role,
  mobile = false,
  collapsed = false,
  onLogout,
  onNavigate
}: {
  role?: RoleKey;
  mobile?: boolean;
  collapsed?: boolean;
  onLogout?: () => void;
  onNavigate?: () => void;
}) {
  const isCompact = collapsed && !mobile;

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/60 bg-white/70 px-3 py-5 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/70',
        isCompact ? 'w-20' : 'w-64',
        mobile ? 'block w-72 lg:hidden' : 'hidden lg:flex'
      )}
    >
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <AplosLogo
          size={isCompact ? 'sm' : 'md'}
          showTagline={!isCompact}
          taglineColor={isCompact ? '#64748b' : '#475569'}
          align={isCompact ? 'center' : 'start'}
        />
      </div>

      <nav className={cn('overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60', isCompact && 'p-2')}>
        <div className={cn('space-y-1', isCompact && 'space-y-2')}>
          {navItems.filter((item) => !item.roles || (role && item.roles.includes(role))).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={isCompact ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) => cn(
                'flex items-center rounded-xl py-2 text-sm font-medium transition',
                isCompact ? 'justify-center px-2' : 'gap-3 px-3',
                isActive ? 'bg-slate-900 text-white dark:bg-blue-500' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <item.icon className="h-4 w-4" />
              {!isCompact ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
        </div>
      </nav>

      {onLogout ? (
        <div className={cn('mt-auto pt-4', isCompact && 'pt-3')}>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className={cn('w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40', isCompact && 'justify-center px-2')}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            {!isCompact ? <span>Logout</span> : null}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
