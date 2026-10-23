import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, deleteNotification } from '../api/notification.api';
import type { AppNotification } from '../api/notification.api';

const TypeIcon = ({ type }: { type: AppNotification['type'] }) => {
  const cls = 'size-4 shrink-0';
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle2 className={`${cls} text-success-ink`} aria-hidden="true" />;
    case 'WARNING':
      return <AlertTriangle className={`${cls} text-warning-ink`} aria-hidden="true" />;
    case 'ERROR':
      return <XCircle className={`${cls} text-danger-ink`} aria-hidden="true" />;
    default:
      return <Info className={`${cls} text-info-ink`} aria-hidden="true" />;
  }
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = () =>
    getMyNotifications({ limit: 15 })
      .then((res) => {
        setItems(res.notifications);
        setUnread(res.unreadCount);
      })
      .catch(() => {
        // notification failures are non-critical (a pending trainer gets a 403 here)
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    const poll = () => {
      getMyNotifications({ limit: 15 })
        .then((res) => {
          setItems(res.notifications);
          setUnread(res.unreadCount);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        // leave local state unchanged so it stays in sync with the server
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {
      // leave local state unchanged so it stays in sync with the server
    }
  };

  const handleDelete = async (id: string, wasRead: boolean) => {
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (!wasRead) setUnread((u) => Math.max(0, u - 1));
    } catch {
      // leave local state unchanged so it stays in sync with the server
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative inline-flex size-11 items-center justify-center rounded-control text-ink hover:bg-surface-sunken"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-card border border-line bg-surface-raised shadow-overlay sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-accent-ink hover:underline"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {loading && items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">Loading...</li>}
            {!loading && items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">No notifications yet</li>}
            {items.map((n) => (
              <li key={n.id} className={`flex items-start ${!n.isRead ? 'bg-accent-soft' : ''}`}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-surface-sunken"
                >
                  <span className="mt-0.5">
                    <TypeIcon type={n.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                      {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{n.message}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id, n.isRead)}
                  aria-label={`Delete notification: ${n.title}`}
                  className="mr-1 mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-sunken hover:text-danger-ink"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
