/**
 * Catálogo único de presentaciones de bombonas.
 * La vista pública y la administrativa consumen esta misma fuente.
 */
export const TIPOS_BOMBONA = [
  {
    key: 'grande',
    label: 'Bombona grande',
    nombre: 'Bombona grande',
    capacidad: '43 kg',
    icon: 'propane_tank',
  },
  {
    key: 'mediana',
    label: 'Bombona mediana',
    nombre: 'Bombona mediana',
    capacidad: '18 kg',
    icon: 'propane_tank',
  },
  {
    key: 'pequena',
    label: 'Bombona pequeña',
    nombre: 'Bombona pequeña',
    capacidad: '10 kg',
    icon: 'propane_tank',
  },
];

/**
 * Configuración visual de los estados de un pago.
 * Los valores coinciden exactamente con el enum del backend.
 */
export const ESTADO_PAGO = {
  pendiente: {
    label: 'Pendiente',
    icon: 'schedule',
    badge: 'bg-secondary-container/40 text-secondary border-secondary/30',
  },
  verificado: {
    label: 'Verificado',
    icon: 'check_circle',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  rechazado: {
    label: 'Rechazado',
    icon: 'cancel',
    badge: 'bg-error/10 text-error border-error/20',
  },
};

export const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'verificado', label: 'Verificados' },
  { value: 'rechazado', label: 'Rechazados' },
];

/**
 * URL pública absoluta para compartir con los habitantes.
 * @param {string} comunidadId
 * @returns {string}
 */
export const buildPublicJornadaUrl = (comunidadId) =>
  `${window.location.origin}/publico/pago-bombonas/${comunidadId}`;

/**
 * Payload de creación según rol.
 * `admin` envía la comunidad; `JEFE_COMUNIDAD` la omite porque el backend la deriva.
 * @param {object} data
 * @param {{ role: string }} options
 * @returns {object}
 */
export const buildCreateJornadaPayload = (data, { role }) => ({
  ...(role === 'admin' ? { comunidad: data.comunidad } : {}),
  precios: {
    grande: Number(data.precios.grande),
    mediana: Number(data.precios.mediana),
    pequena: Number(data.precios.pequena),
  },
  pagoMovil: data.pagoMovil,
});

/**
 * Parámetros server-side limpios para GET /bombonas/pagos.
 * @param {object} filters
 * @returns {object}
 */
export const buildPagosQueryParams = ({ jornadaId, estado, calle, search, page, limit = 20 }) => {
  const params = { page, limit, jornadaId };
  if (estado) params.estado = estado;
  if (calle) params.calle = calle;
  if (search?.trim()) params.search = search.trim();
  return params;
};

/**
 * Indica si un cambio de filtros debe volver a la primera página.
 * @param {object} prev
 * @param {object} next
 * @returns {boolean}
 */
export const shouldResetPage = (prev, next) =>
  prev.estado !== next.estado ||
  prev.calle !== next.calle ||
  prev.jornadaId !== next.jornadaId;
