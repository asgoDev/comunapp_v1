import api from './api';

export const authService = {
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};
