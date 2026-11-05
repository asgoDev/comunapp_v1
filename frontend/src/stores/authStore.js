import { create } from 'zustand';
import { authService } from '../services/authService';
import { queryClient } from '../lib/queryClient';

const LEGACY_AUTH_STORAGE = 'auth-storage';

/**
 * Elimina la sesión persistida por versiones anteriores.
 * Los tokens nunca deben volver a localStorage.
 */
const removeLegacyAuthStorage = () => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(LEGACY_AUTH_STORAGE);
  } catch {
    // Un almacenamiento bloqueado no debe impedir el arranque.
  }
};

removeLegacyAuthStorage();

// Deduplica el bootstrap entre StrictMode y llamadas concurrentes.
let initializationPromise = null;

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: false,
  isInitializing: true,
  isInitialized: false,
  accessToken: null,
  sessionNotice: null,

  login: async (identifier, password) => {
    set({ isLoading: true, sessionNotice: null });
    try {
      const { data } = await authService.login(identifier, password);
      set({
        user: data.user,
        isAuthenticated: true,
        accessToken: data.accessToken,
        isLoading: false,
        isInitializing: false,
        isInitialized: true,
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
      // El logout local debe completarse aunque el servidor no responda.
    } finally {
      get().clearAuth();
    }
  },

  /**
   * Restaura la sesión al cargar la aplicación.
   * Web: la cookie HttpOnly permite rotar el access token.
   * iOS cross-site sin cookies: el refresh falla y se muestra el login.
   */
  initializeAuth: async () => {
    if (get().isInitialized) return get().isAuthenticated;
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      try {
        const { data } = await authService.refresh();
        if (!data?.accessToken) {
          throw new Error('El servidor no devolvió un access token.');
        }

        set({ accessToken: data.accessToken });
        const { data: user } = await authService.me();
        set({
          user,
          isAuthenticated: true,
          accessToken: data.accessToken,
        });
        return true;
      } catch {
        get().clearAuth();
        return false;
      } finally {
        set({ isInitializing: false, isInitialized: true });
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  },

  checkAuth: async ({ silent = false } = {}) => {
    if (!silent) set({ isCheckingAuth: true });
    try {
      const { data } = await authService.me();
      set({ user: data, isAuthenticated: true });
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        get().clearAuth('Tu sesión expiró. Inicia sesión nuevamente.');
      }
      return false;
    } finally {
      if (!silent) set({ isCheckingAuth: false });
    }
  },

  clearAuth: (notice = null) => {
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      sessionNotice: notice,
    });
    queryClient.clear();
  },
}));
