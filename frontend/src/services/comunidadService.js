import api from './api';

export const comunidadService = {
  list: (page = 1, filters = {}) =>
    api.get('/comunidades', { params: { page, ...filters } }),
  getById: (id) => api.get(`/comunidades/${id}`),
  getResumen: (id) => api.get(`/comunidades/${id}/resumen`),
  create: (data) => api.post('/comunidades', data),
  update: (id, data) => api.put(`/comunidades/${id}`, data),
  remove: (id) => api.delete(`/comunidades/${id}`),
};
