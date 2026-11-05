import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // La cookie HttpOnly transporta el refresh token
  headers: {
    'Content-Type': 'application/json',
  },
});

const setAuthorizationHeader = (config, accessToken) => {
  if (!accessToken) return;

  if (config.headers && typeof config.headers.set === 'function') {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
};

// ── Interceptor de petición: access token en memoria ──
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    setAuthorizationHeader(config, accessToken);
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de respuesta: una sola renovación compartida ──
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        if (!data?.accessToken) {
          throw new Error('El servidor no devolvió un access token.');
        }

        useAuthStore.setState({ accessToken: data.accessToken });
        return data.accessToken;
      })
      .catch((error) => {
        useAuthStore
          .getState()
          .clearAuth('Tu sesión expiró. Inicia sesión nuevamente.');
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthRequest = [
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
    ].some((endpoint) => requestUrl.includes(endpoint));

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        setAuthorizationHeader(originalRequest, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
