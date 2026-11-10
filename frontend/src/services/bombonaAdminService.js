import api from './api';

export const bombonaAdminService = {
  listJornadas: (params) => api.get('/bombonas/jornadas', { params }),
  createJornada: (data) => api.post('/bombonas/jornadas', data),
  closeJornada: (id, data) => api.patch(`/bombonas/jornadas/${id}/cerrar`, data),
  listPagos: (params) => api.get('/bombonas/pagos', { params }),
  listCalles: ({ jornadaId }) => api.get('/bombonas/pagos/calles', { params: { jornadaId } }),
  getPago: (id) => api.get(`/bombonas/pagos/${id}`),
  getComprobanteUrl: (id) => api.get(`/bombonas/pagos/${id}/comprobante`),
  reviewPago: (id, data) => api.patch(`/bombonas/pagos/${id}/revision`, data),
};
