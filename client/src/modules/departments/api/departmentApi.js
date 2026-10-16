import apiClient from '../../../core/api/apiClient';
import { endpoints } from '../../../core/api/endpoints';

export const departmentApi = {
  list: async () => (await apiClient.get(endpoints.departments.list)).data,
  details: async (id) => (await apiClient.get(endpoints.departments.details(id))).data,
  create: async (data) => (await apiClient.post(endpoints.departments.list, data)).data,
  update: async (id, data) => (await apiClient.put(endpoints.departments.byId(id), data)).data,
  remove: async (id) => (await apiClient.delete(endpoints.departments.byId(id))).data,
};
