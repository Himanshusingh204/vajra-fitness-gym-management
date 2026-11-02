import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (type, message) => {
    // Parallel requests failing for the same reason should show one toast, not a stack.
    if (get().notifications.some((n) => n.message === message)) return;
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }]
    }));
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }));
    }, 3000);
  },

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  }))
}));
