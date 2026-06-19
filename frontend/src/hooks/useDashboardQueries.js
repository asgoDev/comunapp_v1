import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats().then((res) => res.data),
  });
}
