import apiClient from '../../../core/api/apiClient';
import { endpoints } from '../../../core/api/endpoints';

export const branchApi = {
  list: async () => (await apiClient.get(endpoints.branches.list)).data,
  stats: async () => (await apiClient.get(endpoints.branches.stats)).data,
  create: async (data) => (await apiClient.post(endpoints.branches.list, data)).data,
};
