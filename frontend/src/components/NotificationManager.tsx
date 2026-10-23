import React from 'react';
import { useNotificationStore } from '../store/useNotificationStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const NotificationManager = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 flex flex-col items-end pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          role={notif.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-3 rounded-xl shadow-2xl border backdrop-blur-xl text-white animate-[fade-in_0.3s_ease] ${
            notif.type === 'success'
              ? 'bg-green-600/95 border-green-500'
              : notif.type === 'error'
                ? 'bg-red-600/95 border-red-500'
                : 'bg-blue-600/95 border-blue-500'
          }`}
        >
          {notif.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
          {notif.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {notif.type === 'info' && <Info className="w-5 h-5 shrink-0" />}

          <span className="font-medium text-sm">{notif.message}</span>

          <button
            onClick={() => removeNotification(notif.id)}
            aria-label="Dismiss notification"
            className="ml-1 p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
