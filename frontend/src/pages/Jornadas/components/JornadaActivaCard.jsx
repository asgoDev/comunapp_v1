import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { buildPublicJornadaUrl, TIPOS_BOMBONA } from '../../../utils/bombonaAdmin';
import { formatFechaCorta, formatVES } from '../../../utils/currency';

/**
 * Tarjeta de solo lectura con la jornada activa y sus datos operativos.
 */
export default function JornadaActivaCard({
  jornada,
  comunidadNombre,
  onCerrar,
  onCopiarEnlace,
}) {
  const comunidadId = jornada.comunidad?._id || jornada.comunidad;
  const enlacePublico = comunidadId ? buildPublicJornadaUrl(comunidadId) : '';
  const creador = [jornada.creadaPor?.nombre, jornada.creadaPor?.apellido]
    .filter(Boolean)
    .join(' ') || 'Usuario autorizado';

  const copiarDato = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
      <div className="bg-gradient-to-r from-primary to-primary-container p-lg text-on-primary">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex items-center gap-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-on-primary/10">
              <Icon name="propane_tank" size="28px" />
            </div>
            <div>
              <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Jornada</p>
              <h3 className="text-headline-sm font-bold">Jornada activa</h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-on-primary/20 bg-on-primary/15 px-2.5 py-0.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />
            Activa
          </span>
        </div>

        <div className="mt-md flex flex-wrap gap-x-lg gap-y-xs text-label-sm text-on-primary/80">
          <span className="inline-flex items-center gap-xs">
            <Icon name="location_city" size="16px" />
            {comunidadNombre || 'Comunidad asignada'}
          </span>
          <span className="inline-flex items-center gap-xs">
            <Icon name="person" size="16px" />
            Creada por {creador}
          </span>
          <span className="inline-flex items-center gap-xs">
            <Icon name="calendar_month" size="16px" />
            {formatFechaCorta(jornada.createdAt)}
          </span>
          <span className="inline-flex items-center gap-xs">
            <Icon name="receipt_long" size="16px" />
            {jornada.pagosRegistrados || 0} pagos registrados
          </span>
        </div>
      </div>

      <div className="space-y-lg p-lg">
        <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
          <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
            <div className="mb-sm flex items-center gap-xs text-primary">
              <Icon name="sell" size="20px" />
              <h4 className="text-label-lg font-bold">Precios de la jornada</h4>
            </div>
            <dl className="space-y-xs text-body-sm">
              {TIPOS_BOMBONA.map((tipo) => (
                <div key={tipo.key} className="flex items-center justify-between gap-md">
                  <dt className="text-on-surface-variant">{tipo.label}</dt>
                  <dd className="font-semibold text-on-surface">{formatVES(jornada.precios?.[tipo.key])}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
            <div className="mb-sm flex items-center gap-xs text-primary">
              <Icon name="account_balance" size="20px" />
              <h4 className="text-label-lg font-bold">Pago Móvil</h4>
            </div>
            <dl className="space-y-xs text-body-sm">
              <div className="flex items-center justify-between gap-md">
                <dt className="text-on-surface-variant">Banco</dt>
                <dd className="text-right font-semibold text-on-surface">{jornada.pagoMovil?.banco || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-md">
                <dt className="text-on-surface-variant">Teléfono</dt>
                <dd className="flex items-center gap-xs text-right font-semibold text-on-surface">
                  {jornada.pagoMovil?.telefono || '—'}
                  {jornada.pagoMovil?.telefono && (
                    <button
                      type="button"
                      title="Copiar teléfono"
                      aria-label="Copiar teléfono de Pago Móvil"
                      onClick={() => copiarDato(jornada.pagoMovil.telefono, 'Teléfono')}
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
                  {jornada.pagoMovil?.documento || '—'}
                  {jornada.pagoMovil?.documento && (
                    <button
                      type="button"
                      title="Copiar documento"
                      aria-label="Copiar documento de Pago Móvil"
                      onClick={() => copiarDato(jornada.pagoMovil.documento, 'Documento')}
                      className="rounded p-xs text-primary hover:bg-primary/10"
                    >
                      <Icon name="content_copy" size="16px" />
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-md">
                <dt className="text-on-surface-variant">Titular</dt>
                <dd className="text-right font-semibold text-on-surface">{jornada.pagoMovil?.titular || '—'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-md">
          <label htmlFor="enlace-publico" className="block text-label-lg text-on-surface-variant">
            Enlace público
          </label>
          <div className="mt-xs flex flex-col gap-xs sm:flex-row">
            <input
              id="enlace-publico"
              type="text"
              readOnly
              value={enlacePublico}
              className="min-w-0 flex-1 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onCopiarEnlace(enlacePublico)}
              icon={<Icon name="content_copy" size="18px" />}
            >
              Copiar
            </Button>
          </div>
          <p className="mt-xs text-label-sm text-on-surface-variant">
            Compártalo con los habitantes para que registren su pago.
          </p>
        </div>

        <div className="flex flex-col gap-md border-t border-outline-variant/15 pt-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-xs text-label-sm text-on-surface-variant">
            <Icon name="info" size="18px" className="shrink-0 text-secondary" />
            <p>La edición de precios estará disponible en una próxima versión.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            className="border-error/40 text-error hover:bg-error/10"
            icon={<Icon name="lock" size="18px" />}
          >
            Cerrar jornada
          </Button>
        </div>
      </div>
    </section>
  );
}
