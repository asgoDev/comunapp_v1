import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { habitanteService } from '../services/habitanteService';

export function useHabitantes(page = 1, filters = {}) {
  return useQuery({
    queryKey: ['habitantes', 'list', { page, ...filters }],
    queryFn: () => habitanteService.list(page, filters).then((res) => res.data),
  });
}

export function useHabitanteById(id) {
  return useQuery({
    queryKey: ['habitantes', 'detail', id],
    queryFn: () => habitanteService.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateHabitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => habitanteService.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitantes'] });
    },
  });
}

export function useUpdateHabitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => habitanteService.update(id, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['habitantes'] });
      queryClient.invalidateQueries({ queryKey: ['habitantes', 'detail', variables.id] });
    },
  });
}

export function useDeleteHabitante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => habitanteService.remove(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitantes'] });
    },
  });
}

export function useBulkCreateHabitantes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (habitantes) => habitanteService.bulkCreate(habitantes).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitantes'] });
    },
  });
}
