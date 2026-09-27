import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle, MessageSquare, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { listNotifications, markNotificationRead, deleteNotification, markAllNotificationsRead, deleteAllNotifications } from '../services/notifications';
import { EmptyState } from '../components/layout/EmptyState';
import { InlineLoader } from '../components/layout/LoadingScreen';
import { toast } from 'sonner';
import { formatDateTime } from '../utils/date';

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const notifications = await listNotifications();
      setItems(notifications);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleOpen = async (notification: any) => {
    if (!notification) return;
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification._id);
      }
    } catch {
      // ignore - navigation still proceeds
    }
    if (notification.ticketId) {
      navigate(`/tickets/${notification.ticketId}`);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'ticket_assigned':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'ticket_reply':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'ticket_resolved':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'ticket_note':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'ticket_assigned':
        return 'bg-orange-100 text-orange-700';
      case 'ticket_reply':
        return 'bg-green-100 text-green-700';
      case 'ticket_resolved':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return !item.readAt;
    if (filter === 'read') return item.readAt;
    return true;
  });

  const unreadCount = items.filter((item) => !item.readAt).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
      await load();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure? This will delete all notifications.')) return;
    try {
      await deleteAllNotifications();
      toast.success('All notifications deleted');
      await load();
    } catch {
      toast.error('Failed to delete notifications');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      await load();
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
      await load();
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`Keep track of ticket updates and alerts. ${unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.` : 'All caught up!'}`}
        actions={
          unreadCount > 0 ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4" /> Mark all read
              </Button>
            </div>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={filter} onChange={(event) => setFilter(event.target.value as any)}>
            <option value="all">All notifications ({items.length})</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="read">Read ({items.length - unreadCount})</option>
          </Select>
          {items.length > 0 ? (
            <Button variant="outline" onClick={handleDeleteAll} className="flex items-center gap-2 md:col-start-3">
              <Trash2 className="h-4 w-4" /> Delete all
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <InlineLoader message="Loading notifications..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          description={filter === 'all' ? 'When you get updates on your tickets, they will appear here.' : `You have no ${filter} notifications.`}
          actionLabel="Back to Dashboard"
          onAction={() => window.location.assign('/dashboard')}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((notification) => (
            <Card
              key={notification._id}
              onClick={() => handleOpen(notification)}
              className={`cursor-pointer transition ${!notification.readAt ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30' : ''}`}
            >
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 gap-4">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-900">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h3>
                      <div className="flex items-center gap-2">
                        {!notification.readAt ? <Badge className={getNotificationBadgeColor(notification.type)}>New</Badge> : null}
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 capitalize">{notification.type.replace(/_/g, ' ')}</Badge>
                      </div>
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!notification.readAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkRead(notification._id);
                      }}
                      className="whitespace-nowrap"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(notification._id);
                    }}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
