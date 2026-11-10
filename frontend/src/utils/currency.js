/**
 * Formatea un monto en bolívares con el locale venezolano.
 * @param {number|string} amount
 * @returns {string}
 */
export const formatVES = (amount) =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

/**
 * Formatea una fecha como DD/MM/AAAA.
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatFechaCorta = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/**
 * Formatea una fecha con hora para vistas de detalle.
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatFechaHora = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
