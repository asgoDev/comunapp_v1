import api from './api';

export const authService = {
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};
