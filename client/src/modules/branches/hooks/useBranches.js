import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchApi } from '../api/branchApi';

export const branchKeys = { all: ['branches'], lists: () => ['branches', 'list'], stats: () => ['branches', 'stats'] };
export const useBranches = () => useQuery({ queryKey: branchKeys.lists(), queryFn: branchApi.list });
export const useBranchStats = (enabled = true) => useQuery({ queryKey: branchKeys.stats(), queryFn: branchApi.stats, enabled });
export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: branchApi.create, onSuccess: () => queryClient.invalidateQueries({ queryKey: branchKeys.all }) });
};
