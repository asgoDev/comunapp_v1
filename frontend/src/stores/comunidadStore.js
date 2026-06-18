import { create } from 'zustand';
import { comunidadService } from '../services/comunidadService';

export const useComunidadStore = create((set) => ({
  comunidades: [],
  pagination: {
    total: 0,
    page: 1,
    pages: 1,
  },
  isLoading: false,
  error: null,

  fetchComunidades: async (page = 1, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.list(page, filters);
      set({
        comunidades: response.data.comunidades,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al cargar las comunidades',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchComunidadById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.getById(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al obtener la comunidad',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchComunidadResumen: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.getResumen(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al obtener el resumen de la comunidad',
        isLoading: false,
      });
      throw err;
    }
  },

  createComunidad: async (comunidadData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.create(comunidadData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al crear la comunidad',
        isLoading: false,
      });
      throw err;
    }
  },

  updateComunidad: async (id, comunidadData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.update(id, comunidadData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al actualizar la comunidad',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteComunidad: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await comunidadService.remove(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al desactivar la comunidad',
        isLoading: false,
      });
      throw err;
    }
  },
}));
