import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notification.api';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifs, isLoading: notifsLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  return (
    <div className="bg-surface rounded-card border border-line overflow-hidden">
      <div className="px-6 py-4 border-b border-line flex justify-between items-center">
        <h2 className="font-bold text-lg">Notifications ({notifs?.unreadCount ?? 0} unread)</h2>
        <button onClick={() => markAllRead.mutate()} className="text-sm font-semibold text-accent-ink hover:underline">
          Mark all read
        </button>
      </div>
      {notifsLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : (
        <div className="divide-y divide-line">
          {(notifs?.notifications || []).map((n: any) => (
            <button key={n.id} onClick={() => markRead.mutate(n.id)} className={`w-full text-left px-6 py-4 flex items-start justify-between gap-3 ${n.isRead ? '' : 'bg-accent-soft'}`}>
              <div>
                <p className="font-bold flex items-center gap-2">
                  {n.title}
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent" />}
                </p>
                <p className="text-sm text-ink-muted mt-0.5">{n.message}</p>
                <p className="text-xs text-ink-muted mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
              </div>
            </button>
          ))}
          {(!notifs?.notifications || notifs.notifications.length === 0) && (
            <div className="p-8 text-center text-ink-muted">No notifications yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
