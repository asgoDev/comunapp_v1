import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bombonaAdminService } from '../services/bombonaAdminService';

export const bombonaAdminKeys = {
  jornadaActiva: (comunidadId) => ['bombonas', 'admin', 'jornada-activa', comunidadId],
  pagos: (filters) => ['bombonas', 'admin', 'pagos', filters],
  pago: (id) => ['bombonas', 'admin', 'pago', id],
  calles: (jornadaId) => ['bombonas', 'admin', 'calles', jornadaId],
};

const retryAdminQuery = (failureCount, error) => {
  const status = error.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export function useJornadaActiva(comunidadId) {
  return useQuery({
    queryKey: bombonaAdminKeys.jornadaActiva(comunidadId),
    queryFn: () =>
      bombonaAdminService
        .listJornadas({ comunidadId, activa: 'true', page: 1, limit: 1 })
        .then((res) => res.data),
    enabled: Boolean(comunidadId),
    select: (data) => data.jornadas?.[0] ?? null,
    retry: retryAdminQuery,
  });
}

export function useCreateJornada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => bombonaAdminService.createJornada(data).then((res) => res.data),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: bombonaAdminKeys.jornadaActiva(variables.comunidadId),
      });
    },
  });
}

export function useCloseJornada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => bombonaAdminService.closeJornada(id, data).then((res) => res.data),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: bombonaAdminKeys.jornadaActiva(variables.comunidadId),
        }),
        queryClient.invalidateQueries({ queryKey: ['bombonas', 'admin', 'pagos'] }),
      ]);
    },
  });
}

export function usePagos(filters) {
  return useQuery({
    queryKey: bombonaAdminKeys.pagos(filters),
    queryFn: () => bombonaAdminService.listPagos(filters).then((res) => res.data),
    enabled: Boolean(filters?.jornadaId),
    // Conserva la página anterior solo dentro de la misma jornada; al cambiar de
    // comunidad no se muestran pagos ajenos mientras carga la nueva consulta.
    placeholderData: (previousData, previousQuery) => {
      const previousFilters = previousQuery?.queryKey?.[3];
      return previousFilters?.jornadaId === filters?.jornadaId ? previousData : undefined;
    },
    retry: retryAdminQuery,
  });
}

export function useCalles(jornadaId) {
  return useQuery({
    queryKey: bombonaAdminKeys.calles(jornadaId),
    queryFn: () => bombonaAdminService.listCalles({ jornadaId }).then((res) => res.data.calles),
    enabled: Boolean(jornadaId),
    staleTime: 5 * 60 * 1000,
    retry: retryAdminQuery,
  });
}

export function usePago(pagoId) {
  return useQuery({
    queryKey: bombonaAdminKeys.pago(pagoId),
    queryFn: () => bombonaAdminService.getPago(pagoId).then((res) => res.data),
    enabled: Boolean(pagoId),
    retry: retryAdminQuery,
  });
}

export function useComprobanteUrl() {
  return useMutation({
    mutationFn: (pagoId) =>
      bombonaAdminService.getComprobanteUrl(pagoId).then((res) => res.data),
    retry: false,
  });
}

export function useReviewPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => bombonaAdminService.reviewPago(id, data).then((res) => res.data),
    retry: false,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bombonas', 'admin', 'pagos'] }),
        queryClient.invalidateQueries({ queryKey: bombonaAdminKeys.pago(variables.id) }),
      ]);
    },
    onError: (error, variables) => {
      if (error.response?.data?.code === 'PAGO_YA_REVISADO') {
        queryClient.invalidateQueries({ queryKey: ['bombonas', 'admin', 'pagos'] });
        queryClient.invalidateQueries({ queryKey: bombonaAdminKeys.pago(variables.id) });
      }
    },
  });
}
