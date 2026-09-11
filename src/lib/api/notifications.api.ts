import { api } from './client';
import type { AppNotification } from './notifications.types';

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<AppNotification[]>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<{ ok: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ ok: boolean }>('/notifications/read-all'),
};
