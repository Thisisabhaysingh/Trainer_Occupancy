import apiClient from '../../../core/api/apiClient';
export const projectApi = {
  list: async (params) => (await apiClient.get('/projects', { params })).data,
  get: async (id) => (await apiClient.get(`/projects/${id}`)).data,
  hierarchy: async (id) => (await apiClient.get(`/projects/${id}/hierarchy`)).data,
  create: async (data) => (await apiClient.post('/projects', data)).data,
  update: async (id, data) => (await apiClient.put(`/projects/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/projects/${id}`)).data,
  myProjects: async () => (await apiClient.get('/projects/employee/my-projects')).data,
  myProjectTasks: async (id) => (await apiClient.get(`/projects/employee/my-projects/${id}/tasks`)).data,
};
