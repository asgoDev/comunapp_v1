import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';

export function useUsers(page = 1, filters = {}) {
  return useQuery({
    queryKey: ['users', 'list', { page, ...filters }],
    queryFn: () => userService.list(page, filters).then((res) => res.data),
  });
}

export function useUserById(id) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => userService.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => userService.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => userService.update(id, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => userService.remove(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
