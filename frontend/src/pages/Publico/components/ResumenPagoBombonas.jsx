import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { formatVES } from '../../../utils/currency';

/**
 * Resumen de bombonas y datos de Pago Móvil.
 * Se reutiliza en el aside de escritorio y en el bloque móvil.
 */
export default function ResumenPagoBombonas({
  pagoMovil,
  resumen,
  itemsAgregados,
  onCopiarDato,
  onCopiarTodo,
}) {
  return (
    <div className="space-y-md">
      <section className="overflow-hidden rounded-xl border border-primary/20 bg-surface-container-lowest shadow-sm">
        <div className="bg-primary p-lg text-on-primary">
          <div className="flex items-center justify-between gap-md">
            <div>
              <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Resumen</p>
              <h2 className="text-headline-sm font-bold">Total estimado</h2>
            </div>
            <Icon name="payments" size="30px" />
          </div>
          <p className="mt-4 text-headline-lg font-bold" aria-live="polite">
            {formatVES(resumen.total)}
          </p>
        </div>
        <div className="space-y-md p-lg">
          {itemsAgregados.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Aún no ha agregado bombonas.</p>
          ) : (
            itemsAgregados.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-md text-body-sm">
                <span className="text-on-surface-variant">{item.nombre}</span>
                <span className="font-semibold text-on-surface">
                  {item.cantidad} × {formatVES(item.precio)}
                </span>
              </div>
            ))
          )}
          {resumen.cantidadTotal > 0 && (
            <div className="border-t border-outline-variant/20 pt-md text-label-lg text-on-surface-variant">
              {resumen.cantidadTotal} {resumen.cantidadTotal === 1 ? 'bombona solicitada' : 'bombonas solicitadas'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-sm rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-lg">
        <div className="flex items-center gap-xs text-primary">
          <Icon name="account_balance" size="20px" />
          <h2 className="text-label-lg font-bold">Pago móvil</h2>
        </div>
        <dl className="space-y-xs text-body-sm">
          <div className="flex justify-between gap-md">
            <dt className="text-on-surface-variant">Banco</dt>
            <dd className="text-right font-semibold text-on-surface">{pagoMovil?.banco}</dd>
          </div>
          <div className="flex items-center justify-between gap-md">
            <dt className="text-on-surface-variant">Teléfono</dt>
            <dd className="flex items-center gap-xs text-right font-semibold text-on-surface">
              {pagoMovil?.telefono}
              {pagoMovil?.telefono && (
                <button
                  type="button"
                  title="Copiar teléfono"
                  aria-label="Copiar teléfono de Pago Móvil"
                  onClick={() => onCopiarDato(pagoMovil.telefono, 'Teléfono')}
                  className="rounded p-xs text-primary hover:bg-primary/10"
                >
                  <Icon name="content_copy" size="16px" />
                </button>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-md">
            <dt className="text-on-surface-variant">Documento</dt>
            <dd className="flex items-center gap-xs text-right font-semibold text-on-surface">
              {pagoMovil?.documento}
              {pagoMovil?.documento && (
                <button
                  type="button"
                  title="Copiar documento"
                  aria-label="Copiar documento de Pago Móvil"
                  onClick={() => onCopiarDato(pagoMovil.documento, 'Documento')}
                  className="rounded p-xs text-primary hover:bg-primary/10"
                >
                  <Icon name="content_copy" size="16px" />
                </button>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-md">
            <dt className="text-on-surface-variant">Titular</dt>
            <dd className="text-right font-semibold text-on-surface">{pagoMovil?.titular}</dd>
          </div>
        </dl>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-sm w-full"
          onClick={onCopiarTodo}
          disabled={resumen.cantidadTotal === 0}
          title="Copiar banco, documento, teléfono y monto"
          icon={<Icon name="content_copy" size="16px" />}
        >
          Copiar todo
        </Button>
      </section>
    </div>
  );
}
