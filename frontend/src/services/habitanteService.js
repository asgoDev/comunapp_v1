import api from './api';

export const habitanteService = {
  list: (page = 1, filters = {}) =>
    api.get('/habitantes', { params: { page, ...filters } }),
  getById: (id) => api.get(`/habitantes/${id}`),
  create: (habitanteData) => api.post('/habitantes', habitanteData),
  update: (id, habitanteData) => api.put(`/habitantes/${id}`, habitanteData),
  remove: (id) => api.delete(`/habitantes/${id}`),
  bulkCreate: (habitantes) => api.post('/habitantes/bulk', { habitantes }),
};

