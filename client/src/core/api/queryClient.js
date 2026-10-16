import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => error?.status !== 401 && failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
