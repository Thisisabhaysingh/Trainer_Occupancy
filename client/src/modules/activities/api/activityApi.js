import apiClient from '../../../core/api/apiClient';
export const activityApi = {
  list: async (params) => (await apiClient.get('/activities', { params })).data,
  mine: async () => (await apiClient.get('/activities/employee')).data,
  today: async (params) => (await apiClient.get('/activities/employee/today', { params })).data,
  history: async (params) => (await apiClient.get('/activities/employee/history', { params })).data,
  department: async (params) => (await apiClient.get('/activities/department', { params })).data,
  create: async (data) => (await apiClient.post('/activities', data)).data,
  update: async (id, data) => (await apiClient.patch(`/activities/${id}`, data)).data,
  updateStatus: async (id, status) => (await apiClient.patch(`/activities/${id}/status`, { status })).data,
  remove: async (id) => (await apiClient.delete(`/activities/${id}`)).data,
  templates: async () => (await apiClient.get('/activities/templates')).data,
};
