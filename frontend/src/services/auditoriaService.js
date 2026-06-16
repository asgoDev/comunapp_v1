import api from './api';

export const auditoriaService = {
  getLogs: (page = 1, filters = {}) =>
    api.get('/auditoria', { params: { page, ...filters } }),
};
