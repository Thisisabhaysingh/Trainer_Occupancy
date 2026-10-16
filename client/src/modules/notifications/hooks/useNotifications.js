import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
export const notificationKeys = { all: ['notifications'] };
export const useNotifications = () => useQuery({ queryKey: notificationKeys.all, queryFn: notificationApi.list });
const useInvalidatingMutation = (fn) => { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }) }); };
export const useMarkNotificationRead = () => useInvalidatingMutation(notificationApi.markRead);
export const useMarkAllNotificationsRead = () => useInvalidatingMutation(notificationApi.markAllRead);
export const useClearOldNotifications = () => useInvalidatingMutation(notificationApi.clearOldRead);
