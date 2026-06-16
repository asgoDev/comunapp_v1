import { create } from 'zustand';
import { auditoriaService } from '../services/auditoriaService';

export const useAuditoriaStore = create((set) => ({
  logs: [],
  pagination: {
    total: 0,
    page: 1,
    pages: 1,
    limit: 50,
  },
  isLoading: false,
  error: null,

  fetchLogs: async (page = 1, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await auditoriaService.getLogs(page, filters);
      set({
        logs: response.data.logs,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al cargar los logs de auditoría',
        isLoading: false,
      });
      throw err;
    }
  },
}));
