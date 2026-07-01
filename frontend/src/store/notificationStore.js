import { create } from 'zustand';
import { fetchApi } from '../lib/api';
import { useChatStore } from './chatStore';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi('/notifications');
      const notifications = data.notifications || [];
      const unreadCount = notifications.filter(n => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      set({ error: err.message || 'Lỗi khi tải thông báo', isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      
      const { notifications, unreadCount } = get();
      const newNotifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      set({ 
        notifications: newNotifications,
        unreadCount: Math.max(0, unreadCount - 1)
      });
    } catch (err) {
      console.error('Lỗi khi đọc thông báo:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      
      const { notifications } = get();
      const newNotifications = notifications.map(n => ({ ...n, is_read: true }));
      set({ 
        notifications: newNotifications,
        unreadCount: 0
      });
    } catch (err) {
      console.error('Lỗi khi đọc tất cả thông báo:', err);
    }
  },

  addNotification: (notification) => {
    const { notifications, unreadCount } = get();
    set({ 
      notifications: [notification, ...notifications],
      unreadCount: unreadCount + 1
    });
  },

  listenSocketEvents: () => {
    const socket = useChatStore.getState().getSocket();
    if (socket) {
      // Đảm bảo không gắn nhiều lần
      socket.off('notification:new');
      socket.on('notification:new', (notification) => {
        get().addNotification(notification);
      });
    }
  }
}));
