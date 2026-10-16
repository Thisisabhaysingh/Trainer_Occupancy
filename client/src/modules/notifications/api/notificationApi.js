import apiClient from '../../../core/api/apiClient';
export const notificationApi = {
  list: async () => (await apiClient.get('/notifications')).data,
  markRead: async (id) => (await apiClient.put(`/notifications/${id}/read`)).data,
  markAllRead: async (type) => (await apiClient.put(`/notifications/read-all${type ? `/${type}` : ''}`)).data,
  clearOldRead: async () => (await apiClient.delete('/notifications/old-read')).data,
};
