import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comunidadService } from '../services/comunidadService';

export function useComunidades(page = 1, filters = {}) {
  return useQuery({
    queryKey: ['comunidades', 'list', { page, ...filters }],
    queryFn: () => comunidadService.list(page, filters).then((res) => res.data),
  });
}

export function useComunidadesDropdown() {
  return useQuery({
    queryKey: ['comunidades', 'dropdown'],
    queryFn: () => comunidadService.list(1, { limit: 200 }).then((res) => res.data.comunidades),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useComunidadById(id) {
  return useQuery({
    queryKey: ['comunidades', 'detail', id],
    queryFn: () => comunidadService.getById(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useComunidadResumen(id) {
  return useQuery({
    queryKey: ['comunidades', 'resumen', id],
    queryFn: () => comunidadService.getResumen(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateComunidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => comunidadService.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] });
    },
  });
}

export function useUpdateComunidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => comunidadService.update(id, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] });
      // Also invalidate the specific detail query if it was loaded
      queryClient.invalidateQueries({ queryKey: ['comunidades', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['comunidades', 'resumen', variables.id] });
    },
  });
}

export function useDeleteComunidad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => comunidadService.remove(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] });
    },
  });
}
