import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { listNotifications } from '../../services/notifications';
import { getAccessToken } from '../../services/token';
import { useAppSelector } from '../../hooks/useAppSelector';
import { cn } from '../../utils/cn';

function resolveSocketUrl() {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000';
  // VITE_API_URL may include a trailing /api — sockets live at the origin root.
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export function NotificationBell() {
  const user = useAppSelector((state) => state.auth.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchRef = useRef<number>(0);
  const location = useLocation();
  const isNotificationsPage = location.pathname === '/notifications';

  const loadNotifications = useCallback(async (force = false) => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;
    try {
      const notifications = await listNotifications();
      setUnreadCount(notifications.filter((n: any) => !n.readAt).length);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  }, [user]);

  useEffect(() => {
    if (isNotificationsPage || !user) return;
    void loadNotifications(true);
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [isNotificationsPage, user, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: { token: getAccessToken() || undefined },
      reconnection: true,
      reconnectionAttempts: 5
    });
    socket.emit('authenticate', getAccessToken() || '');
    const onNotification = () => {
      void loadNotifications(true);
    };
    socket.on('notification', onNotification);
    socket.on('connect_error', (err) => {
      console.warn('Notification socket error', err.message);
    });
    return () => {
      socket.off('notification', onNotification);
      socket.disconnect();
    };
  }, [user, loadNotifications]);

  return (
    <Link
      to="/notifications"
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-lg border transition',
        'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      )}
      aria-label="Notifications"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
