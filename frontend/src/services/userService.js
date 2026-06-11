import api from './api';

export const userService = {
  list: (page = 1, filters = {}) =>
    api.get('/users', { params: { page, ...filters } }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  remove: (id) => api.delete(`/users/${id}`),
};
