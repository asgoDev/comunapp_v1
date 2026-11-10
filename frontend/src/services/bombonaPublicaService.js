import publicApi from './publicApi';

const communityPath = (comunidadId) =>
  `/publico/bombonas/comunidades/${encodeURIComponent(comunidadId)}`;

export const bombonaPublicaService = {
  getJornadaActiva: (comunidadId) =>
    publicApi.get(`${communityPath(comunidadId)}/jornada-activa`),

  crearPago: ({ comunidadId, data, idempotencyKey }) => {
    const formData = new FormData();
    formData.append('calle', data.calle);
    formData.append('numeroCasa', data.numeroCasa);
    formData.append('propietario', data.propietario);
    formData.append('referencia', data.referencia);
    formData.append('bombonasGrande', String(data.bombonas.grande));
    formData.append('bombonasMediana', String(data.bombonas.mediana));
    formData.append('bombonasPequena', String(data.bombonas.pequena));
    formData.append('website', '');
    formData.append('comprobante', data.comprobante, data.comprobante.name);

    return publicApi.post(`${communityPath(comunidadId)}/pagos`, formData, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: 120000,
    });
  },
};
