import Icon from '../../../components/ui/Icon';
import Pagination from '../../../components/ui/Pagination';
import { ESTADO_PAGO } from '../../../utils/bombonaAdmin';
import { formatFechaCorta, formatVES } from '../../../utils/currency';

const totalBombonas = (pago) =>
  Number(pago.bombonas?.grande || 0) +
  Number(pago.bombonas?.mediana || 0) +
  Number(pago.bombonas?.pequena || 0);

const EstadoBadge = ({ estado }) => {
  const config = ESTADO_PAGO[estado] || {
    label: estado,
    icon: 'help',
    badge: 'bg-surface-container text-on-surface border-outline-variant/20',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badge}`}>
      <Icon name={config.icon} size="14px" />
      {config.label}
    </span>
  );
};

export default function PagosTable({
  pagos = [],
  isLoading,
  isError,
  onVerDetalle,
  pagination = { page: 1, pages: 1, total: 0 },
  onPageChange,
  isEmpty,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-md p-xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-body-sm font-medium text-on-surface-variant">Cargando pagos...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center space-y-sm p-xl text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
              <Icon name="cloud_off" size="36px" />
            </div>
            <h3 className="text-label-lg font-bold text-on-surface">No se pudieron cargar los pagos</h3>
            <p className="max-w-sm text-body-sm text-on-surface-variant">
              Revise su conexión e intente nuevamente.
            </p>
          </div>
        ) : isEmpty || pagos.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-sm p-xl text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-outline-variant/10 text-outline">
              <Icon name="receipt_long" size="36px" />
            </div>
            <h3 className="text-label-lg font-bold text-on-surface">No hay pagos registrados</h3>
            <p className="max-w-sm text-body-sm text-on-surface-variant">
              No hay pagos registrados con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low font-label-lg text-xs uppercase tracking-wider text-on-surface-variant">
                <th className="px-lg py-md">Código</th>
                <th className="px-lg py-md">Calle / Casa</th>
                <th className="px-lg py-md">Propietario</th>
                <th className="px-lg py-md">Referencia</th>
                <th className="px-lg py-md">Fecha</th>
                <th className="px-lg py-md">Bombonas</th>
                <th className="px-lg py-md">Total</th>
                <th className="px-lg py-md">Estado</th>
                <th className="px-lg py-md text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
              {pagos.map((pago) => (
                <tr
                  key={pago._id}
                  onClick={() => onVerDetalle(pago._id)}
                  className="cursor-pointer transition-colors hover:bg-primary-container/5"
                >
                  <td className="px-lg py-md font-semibold text-primary">{pago.codigoSeguimiento}</td>
                  <td className="px-lg py-md">
                    <p className="font-medium">{pago.calle}</p>
                    <p className="text-xs text-on-surface-variant">Casa {pago.numeroCasa}</p>
                  </td>
                  <td className="px-lg py-md capitalize">{pago.propietario}</td>
                  <td className="px-lg py-md">{pago.referencia}</td>
                  <td className="px-lg py-md">{formatFechaCorta(pago.createdAt)}</td>
                  <td className="px-lg py-md font-semibold">{totalBombonas(pago)}</td>
                  <td className="px-lg py-md font-semibold text-on-surface">{formatVES(pago.total)}</td>
                  <td className="px-lg py-md">
                    <EstadoBadge estado={pago.estado} />
                  </td>
                  <td className="px-lg py-md text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onVerDetalle(pago._id);
                      }}
                      title={`Ver detalle del pago ${pago.codigoSeguimiento}`}
                      aria-label={`Ver detalle del pago ${pago.codigoSeguimiento}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/20 px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant transition-all hover:bg-outline-variant/10 active:scale-95"
                    >
                      <Icon name="visibility" size="18px" />
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !isError && pagos.length > 0 && (
        <div className="bg-surface-container-low px-lg py-sm">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
