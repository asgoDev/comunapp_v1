import { useMutation, useQuery } from '@tanstack/react-query';
import { bombonaPublicaService } from '../services/bombonaPublicaService';

const retryPublicQuery = (failureCount, error) => {
  const status = error.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export function useBombonaJornadaActiva(comunidadId) {
  return useQuery({
    queryKey: ['bombonas', 'publica', 'jornada', comunidadId],
    queryFn: () => bombonaPublicaService.getJornadaActiva(comunidadId).then((res) => res.data),
    enabled: Boolean(comunidadId),
    staleTime: 15 * 1000,
    gcTime: 60 * 1000,
    retry: retryPublicQuery,
    refetchOnWindowFocus: true,
  });
}

export function useCrearPagoBombona() {
  return useMutation({
    mutationFn: (payload) => bombonaPublicaService.crearPago(payload).then((res) => res.data),
    retry: false,
  });
}
