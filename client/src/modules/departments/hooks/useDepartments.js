import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentApi } from '../api/departmentApi';

export const departmentKeys = {
  all: ['departments'],
  lists: () => [...departmentKeys.all, 'list'],
  details: (id) => [...departmentKeys.all, 'details', id],
};

export const useDepartments = () => useQuery({
  queryKey: departmentKeys.lists(),
  queryFn: departmentApi.list,
});

export const useDepartmentDetails = (id) => useQuery({
  queryKey: departmentKeys.details(id),
  queryFn: () => departmentApi.details(id),
  enabled: Boolean(id),
});

const useDepartmentMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  });
};

export const useCreateDepartment = () => useDepartmentMutation(departmentApi.create);
export const useUpdateDepartment = () => useDepartmentMutation(({ id, data }) => departmentApi.update(id, data));
export const useDeleteDepartment = () => useDepartmentMutation(departmentApi.remove);
