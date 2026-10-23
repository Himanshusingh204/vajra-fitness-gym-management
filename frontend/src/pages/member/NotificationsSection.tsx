import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notification.api';
import { Button, Card, EmptyState, PageHeader, Skeleton } from '../../components/ui';

export default function NotificationsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['myNotifications', 'page'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    refetchInterval: 30000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });

  const list = data?.notifications ?? [];

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={!data?.unreadCount}>
            Mark all read
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : list.length === 0 ? (
        <Card><EmptyState icon={Bell} title="No notifications yet" /></Card>
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={`w-full rounded-card border p-4 text-left transition-colors sm:p-5 ${n.isRead ? 'border-line bg-surface' : 'border-accent-ink/30 bg-accent-soft'}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {n.title}
                    {!n.isRead && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
                  </span>
                  <span className="shrink-0 text-sm text-ink-muted">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                </span>
                <span className="mt-1 block text-sm text-ink-muted">{n.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
