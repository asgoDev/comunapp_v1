import { create } from 'zustand';
import { habitanteService } from '../services/habitanteService';

export const useHabitanteStore = create((set) => ({
  habitantes: [],
  pagination: {
    total: 0,
    page: 1,
    pages: 1,
  },
  isLoading: false,
  error: null,

  fetchHabitantes: async (page = 1, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.list(page, filters);
      set({
        habitantes: response.data.habitantes,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al cargar los habitantes',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchHabitanteById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.getById(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al obtener el habitante',
        isLoading: false,
      });
      throw err;
    }
  },

  createHabitante: async (habitanteData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.create(habitanteData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al registrar el habitante',
        isLoading: false,
      });
      throw err;
    }
  },

  updateHabitante: async (id, habitanteData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.update(id, habitanteData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al actualizar el habitante',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteHabitante: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.remove(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al eliminar el habitante',
        isLoading: false,
      });
      throw err;
    }
  },

  bulkCreateHabitantes: async (habitantes) => {
    set({ isLoading: true, error: null });
    try {
      const response = await habitanteService.bulkCreate(habitantes);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error en la carga masiva',
        isLoading: false,
      });
      throw err;
    }
  },
}));

