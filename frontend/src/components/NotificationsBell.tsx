import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, deleteNotification } from '../api/notification.api';
import type { AppNotification } from '../api/notification.api';

const TypeIcon = ({ type }: { type: AppNotification['type'] }) => {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle2 className={`${cls} text-emerald-500`} />;
    case 'WARNING':
      return <AlertTriangle className={`${cls} text-amber-500`} />;
    case 'ERROR':
      return <XCircle className={`${cls} text-red-500`} />;
    default:
      return <Info className={`${cls} text-[var(--color-primary)]`} />;
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
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyNotifications({ limit: 15 });
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* notification failures are non-critical */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* leave local state unchanged so it stays in sync with the server */
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
      /* leave local state unchanged so it stays in sync with the server */
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, wasRead: boolean) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (!wasRead) setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* leave local state unchanged so it stays in sync with the server */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        aria-label="Notifications"
        className="relative p-2.5 rounded-xl text-[var(--color-charcoal)] dark:text-gray-200 hover:bg-[var(--color-primary)]/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 glass-strong rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-deepgray)] dark:text-white">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
            {loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">Loading...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">No notifications yet</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-[var(--color-primary)]/5 ${
                  !n.isRead ? 'bg-[var(--color-primary)]/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5"><TypeIcon type={n.type} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--color-deepgray)] dark:text-white truncate">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />}
                    </div>
                    <p className="text-xs text-[var(--color-muted)] line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDelete(e, n.id, n.isRead)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDelete(e as unknown as React.MouseEvent, n.id, n.isRead);
                      }
                    }}
                    aria-label="Delete notification"
                    className="p-1 rounded-md text-[var(--color-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
