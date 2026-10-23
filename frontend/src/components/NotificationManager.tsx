import { useNotificationStore } from '../store/useNotificationStore';
import { Toast } from './ui/Toast';

export const NotificationManager = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-end gap-2 sm:left-auto">
      {notifications.map((n) => (
        <Toast key={n.id} type={n.type} message={n.message} onDismiss={() => removeNotification(n.id)} />
      ))}
    </div>
  );
};
