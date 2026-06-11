import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isCheckingAuth: false,
      sessionExpiry: null,
      accessToken: null,
      refreshToken: null,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authService.login(identifier, password);
          set({
            user: data.user,
            isAuthenticated: true,
            sessionExpiry: Date.now() + 8 * 60 * 60 * 1000,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
          });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Continuar con logout local aunque falle el servidor
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null,
            accessToken: null,
            refreshToken: null,
          });
        }
      },

      checkAuth: async ({ silent = false } = {}) => {
        if (!silent) set({ isCheckingAuth: true });
        try {
          const { data } = await authService.me();
          set({
            user: data,
            isAuthenticated: true,
            sessionExpiry: Date.now() + 8 * 60 * 60 * 1000,
          });
          return true;
        } catch (error) {
          if (error.response?.status === 401) {
            set({
              user: null,
              isAuthenticated: false,
              sessionExpiry: null,
              accessToken: null,
              refreshToken: null,
            });
          }
          return false;
        } finally {
          if (!silent) set({ isCheckingAuth: false });
        }
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionExpiry: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      extendSession: () => {
        set({ sessionExpiry: Date.now() + 8 * 60 * 60 * 1000 });
      },
    }),
    {
      name: 'sigas-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
