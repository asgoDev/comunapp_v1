/**
 * Calcula el resumen de bombonas solicitadas.
 * @param {{ cantidades?: object, precios?: object, tipos?: Array }} params
 * @returns {{ items: Array, total: number, cantidadTotal: number }}
 */
export const calcularResumenBombonas = ({ cantidades = {}, precios = {}, tipos = [] }) =>
  tipos.reduce(
    (acumulado, tipo) => {
      const cantidad = Number(cantidades?.[tipo.key]) || 0;
      const precio = Number(precios?.[tipo.key]) || 0;
      acumulado.items.push({
        ...tipo,
        cantidad,
        precio,
        subtotal: cantidad * precio,
      });
      acumulado.total += cantidad * precio;
      acumulado.cantidadTotal += cantidad;
      return acumulado;
    },
    { items: [], total: 0, cantidadTotal: 0 },
  );

/**
 * Deja únicamente los tipos con cantidad mayor que cero.
 * @param {Array} items
 * @returns {Array}
 */
export const filtrarItemsAgregados = (items = []) =>
  items.filter((item) => Number(item.cantidad) > 0);

/**
 * Construye la cadena para el botón "Copiar todo".
 * El monto se copia como número plano, por ejemplo: 300.00.
 * @param {{ banco?: string, documento?: string, telefono?: string, total?: number }} datos
 * @returns {string}
 */
export const buildPagoMovilCopyText = ({ banco, documento, telefono, total }) => {
  const limpiar = (valor) => String(valor ?? '').trim();
  return [
    limpiar(banco),
    limpiar(documento),
    limpiar(telefono),
    Number(total || 0).toFixed(2),
  ].join(' ');
};
