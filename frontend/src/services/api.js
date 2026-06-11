import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Seguir enviando cookies como fallback
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Interceptor de petición: inyectar Authorization header ──
api.interceptors.request.use(
  async (config) => {
    let accessToken = null;

    try {
      // Intentar obtener el token de Zustand en memoria (evita latencia o bloqueos de localStorage)
      const { useAuthStore } = await import('../stores/authStore');
      accessToken = useAuthStore.getState().accessToken;
    } catch (storeError) {
      // Fallback a localStorage si la importación dinámica falla o está inicializándose
      try {
        const raw = localStorage.getItem('sigas-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          accessToken = parsed?.state?.accessToken;
        }
      } catch (storageError) {
        // Ignorar fallos de lectura de localStorage
      }
    }

    // Inyectar el token de forma robusta
    if (accessToken) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de respuesta: auto-refresh del token ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no es un retry ni la ruta de refresh/login/logout
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/logout')
    ) {
      if (isRefreshing) {
        // Encolar requests mientras se refresca
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Obtener refreshToken del store de forma dinámica
        let currentRefreshToken = null;
        try {
          const { useAuthStore } = await import('../stores/authStore');
          currentRefreshToken = useAuthStore.getState().refreshToken;
        } catch {
          // Fallback a localStorage
          try {
            const raw = localStorage.getItem('sigas-auth');
            if (raw) {
              const parsed = JSON.parse(raw);
              currentRefreshToken = parsed?.state?.refreshToken;
            }
          } catch {}
        }

        // Enviar refreshToken tanto por cookie (automático via withCredentials)
        // como por body (para iOS donde las cookies no llegan)
        const { data } = await api.post('/auth/refresh', {
          refreshToken: currentRefreshToken,
        });

        // Actualizar tokens en el store de Zustand
        const { useAuthStore } = await import('../stores/authStore');
        const store = useAuthStore.getState();
        store.extendSession();

        // Guardar nuevos tokens recibidos del servidor
        useAuthStore.setState({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        // Actualizar el header del request original con el nuevo token de forma robusta
        if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
          originalRequest.headers.set('Authorization', `Bearer ${data.accessToken}`);
        } else {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Limpiar estado de auth y redirigir al login
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
