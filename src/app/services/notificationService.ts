import { apiClient } from './apiClient';

export const notificationService = {
  async getAll(page = 1) {
    return apiClient.get(`/notifications?page=${page}`);
  },
  async getUnreadCount() {
    return apiClient.get('/notifications/unread-count');
  },
  async markRead(id: number) {
    return apiClient.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    return apiClient.post('/notifications/read-all');
  },
};
