import { useQuery } from '@tanstack/react-query';
import { auditoriaService } from '../services/auditoriaService';

export function useAuditoriaLogs(page = 1, filters = {}) {
  return useQuery({
    queryKey: ['auditoria', 'logs', { page, ...filters }],
    queryFn: () => auditoriaService.getLogs(page, filters).then((res) => res.data),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
