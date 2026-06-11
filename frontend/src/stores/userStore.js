import { create } from 'zustand';
import { userService } from '../services/userService';

export const useUserStore = create((set) => ({
  users: [],
  pagination: {
    total: 0,
    page: 1,
    pages: 1,
  },
  isLoading: false,
  error: null,

  fetchUsers: async (page = 1, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userService.list(page, filters);
      set({
        users: response.data.users,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al cargar los usuarios',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchUserById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userService.getById(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al obtener el usuario',
        isLoading: false,
      });
      throw err;
    }
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userService.create(userData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al crear el usuario',
        isLoading: false,
      });
      throw err;
    }
  },

  updateUser: async (id, userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userService.update(id, userData);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al actualizar el usuario',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userService.remove(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Error al desactivar el usuario',
        isLoading: false,
      });
      throw err;
    }
  },
}));
