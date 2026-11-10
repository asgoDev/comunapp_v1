import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import { useComprobanteUrl, usePago, useReviewPago } from '../../../hooks/useBombonaAdminQueries';
import { ESTADO_PAGO, TIPOS_BOMBONA } from '../../../utils/bombonaAdmin';
import { getBombonaErrorMessage } from '../../../utils/bombonaErrors';
import { formatFechaHora, formatVES } from '../../../utils/currency';
import { rechazarPagoSchema } from '../../../validations/bombonaAdmin';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const Dato = ({ label, value, highlight = false }) => (
  <div>
    <dt className="text-label-sm text-on-surface-variant">{label}</dt>
    <dd className={`mt-0.5 font-semibold ${highlight ? 'text-headline-sm text-primary' : 'text-on-surface'}`}>
      {value || '—'}
    </dd>
  </div>
);

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

function PagoDetalleContenido({ pagoId, comunidadNombre, onRevisionExitosa }) {
  const { data: pago, isLoading, isError, refetch } = usePago(pagoId);
  const comprobanteUrl = useComprobanteUrl();
  const review = useReviewPago();
  const [enlaceBloqueado, setEnlaceBloqueado] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(rechazarPagoSchema),
    defaultValues: { motivoRechazo: '' },
  });

  useEffect(() => {
    setEnlaceBloqueado('');
    setMostrarRechazo(false);
    reset({ motivoRechazo: '' });
  }, [pagoId, reset]);

  const manejarErrorRevision = (error) => {
    if (error.response?.data?.code === 'PAGO_YA_REVISADO') {
      toast.error(error.response?.data?.message || 'El pago ya fue revisado.');
      refetch();
      return;
    }
    toast.error(
      error.response?.data?.message || 'No se pudo completar la revisión del pago.',
    );
  };

  const onVerificar = async () => {
    try {
      await review.mutateAsync({ id: pagoId, data: { estado: 'verificado' } });
      toast.success('Pago verificado exitosamente.');
      onRevisionExitosa?.();
    } catch (error) {
      manejarErrorRevision(error);
    }
  };

  const onRechazar = async (values) => {
    try {
      await review.mutateAsync({
        id: pagoId,
        data: { estado: 'rechazado', motivoRechazo: values.motivoRechazo.trim() },
      });
      toast.success('Pago rechazado exitosamente.');
      setMostrarRechazo(false);
      reset({ motivoRechazo: '' });
      onRevisionExitosa?.();
    } catch (error) {
      manejarErrorRevision(error);
    }
  };

  const abrirComprobante = async () => {
    try {
      const data = await comprobanteUrl.mutateAsync(pagoId);
      if (!data?.url) {
        toast.error('No se recibió un enlace válido para el comprobante.');
        return;
      }

      const nuevaVentana = window.open('', '_blank');
      if (!nuevaVentana) {
        setEnlaceBloqueado(data.url);
        toast.error('El navegador bloqueó la pestaña. Use el enlace alternativo.');
        return;
      }

      nuevaVentana.opener = null;
      nuevaVentana.location.href = data.url;
      setEnlaceBloqueado('');
    } catch (error) {
      toast.error(getBombonaErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-md p-xl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-body-sm font-medium text-on-surface-variant">Cargando detalle del pago...</p>
      </div>
    );
  }

  if (isError || !pago) {
    return (
      <div className="flex flex-col items-center justify-center space-y-sm p-xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
          <Icon name="cloud_off" size="36px" />
        </div>
        <h3 className="text-label-lg font-bold text-on-surface">No se pudo cargar el pago</h3>
        <p className="max-w-sm text-body-sm text-on-surface-variant">
          Revise su conexión e intente nuevamente.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          icon={<Icon name="refresh" size="18px" />}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const revisor = pago.revisadoPor?.nombre
    ? `${pago.revisadoPor.nombre} ${pago.revisadoPor.apellido || ''}`.trim()
    : 'Usuario autorizado';

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div>
          <p className="text-label-sm text-on-surface-variant">Código de seguimiento</p>
          <p className="text-label-lg font-bold text-on-surface">{pago.codigoSeguimiento}</p>
        </div>
        <EstadoBadge estado={pago.estado} />
      </div>

      <dl className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <Dato label="Comunidad" value={pago.comunidad?.nombre || comunidadNombre} />
        <Dato label="Calle y casa" value={`${pago.calle} · Casa ${pago.numeroCasa}`} />
        <Dato label="Propietario" value={pago.propietario} />
        <Dato label="Referencia" value={pago.referencia} />
        <Dato label="Fecha de registro" value={formatFechaHora(pago.createdAt)} />
        <Dato label="Total" value={formatVES(pago.total)} highlight />
      </dl>

      <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
        <h4 className="mb-sm flex items-center gap-xs text-label-lg font-bold text-on-surface">
          <Icon name="propane_tank" size="20px" className="text-primary" />
          Bombonas solicitadas
        </h4>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
          {TIPOS_BOMBONA.map((tipo) => (
            <div key={tipo.key} className="rounded-lg bg-surface-container-lowest p-sm">
              <p className="text-label-sm text-on-surface-variant">{tipo.label}</p>
              <p className="text-headline-sm font-bold text-on-surface">{pago.bombonas?.[tipo.key] ?? 0}</p>
              <p className="text-label-sm text-on-surface-variant">
                {formatVES(pago.precios?.[tipo.key])} c/u
              </p>
            </div>
          ))}
        </div>
      </section>

      {pago.estado !== 'pendiente' && (
        <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
          <h4 className="mb-sm flex items-center gap-xs text-label-lg font-bold text-on-surface">
            <Icon name="fact_check" size="20px" className="text-primary" />
            Revisión
          </h4>
          <dl className="grid grid-cols-1 gap-md text-body-sm sm:grid-cols-2">
            <Dato label="Estado final" value={ESTADO_PAGO[pago.estado]?.label || pago.estado} />
            <Dato label="Fecha de revisión" value={formatFechaHora(pago.fechaRevision)} />
            <Dato label="Revisor" value={revisor} />
            {pago.motivoRechazo && <Dato label="Motivo del rechazo" value={pago.motivoRechazo} />}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h4 className="flex items-center gap-xs text-label-lg font-bold text-on-surface">
            <Icon name="image" size="20px" className="text-primary" />
            Comprobante
          </h4>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              pago.comprobante?.disponible
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-error/20 bg-error/10 text-error'
            }`}
          >
            <Icon name={pago.comprobante?.disponible ? 'check_circle' : 'cancel'} size="14px" />
            {pago.comprobante?.disponible ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        <p className="mt-xs text-body-sm text-on-surface-variant">
          {pago.comprobante?.contentType === 'image/png'
            ? 'PNG'
            : pago.comprobante?.contentType === 'image/jpeg'
              ? 'JPG'
              : '—'}{' '}
          · {formatBytes(pago.comprobante?.size)}
        </p>

        {pago.comprobante?.disponible ? (
          <div className="mt-sm">
            <Button
              type="button"
              variant="outline"
              onClick={abrirComprobante}
              loading={comprobanteUrl.isPending}
              disabled={comprobanteUrl.isPending}
              icon={<Icon name="open_in_new" size="18px" />}
            >
              Ver comprobante
            </Button>
          </div>
        ) : (
          <p className="mt-sm text-label-sm text-error">
            El comprobante ya no está disponible para consulta.
          </p>
        )}

        {enlaceBloqueado && (
          <a
            href={enlaceBloqueado}
            target="_blank"
            rel="noreferrer"
            className="mt-sm inline-flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/5 px-md py-2 text-label-lg font-semibold text-primary hover:bg-primary/10"
          >
            <Icon name="open_in_new" size="18px" />
            Abrir comprobante en una pestaña nueva
          </a>
        )}

        <p className="mt-xs text-label-sm text-on-surface-variant">
          El enlace es temporal y vence en 5 minutos.
        </p>
      </section>

      {pago.estado === 'pendiente' && (
        <section className="space-y-md rounded-lg border border-outline-variant/15 bg-surface-container-low p-md">
          <h4 className="flex items-center gap-xs text-label-lg font-bold text-on-surface">
            <Icon name="rule" size="20px" className="text-primary" />
            Acciones de revisión
          </h4>

          {!mostrarRechazo ? (
            <div className="flex flex-col gap-sm sm:flex-row">
              <Button
                type="button"
                onClick={onVerificar}
                loading={review.isPending}
                disabled={review.isPending}
                icon={<Icon name="check_circle" size="18px" />}
              >
                Verificar pago
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setMostrarRechazo(true)}
                disabled={review.isPending}
                icon={<Icon name="cancel" size="18px" />}
              >
                Rechazar pago
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onRechazar)} className="space-y-md" noValidate>
              <div className="space-y-1">
                <label htmlFor="motivoRechazo" className="block text-label-lg text-on-surface-variant">
                  Motivo del rechazo
                </label>
                <textarea
                  id="motivoRechazo"
                  rows={3}
                  maxLength={500}
                  placeholder="Explique el motivo del rechazo (mínimo 5 caracteres)"
                  className={`w-full rounded-lg border bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 ${
                    errors.motivoRechazo ? 'border-error' : 'border-outline-variant/40'
                  }`}
                  {...register('motivoRechazo')}
                />
                {errors.motivoRechazo && (
                  <p className="text-label-sm text-error">{errors.motivoRechazo.message}</p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMostrarRechazo(false);
                    reset({ motivoRechazo: '' });
                  }}
                  disabled={review.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={review.isPending}
                  disabled={review.isPending}
                  icon={<Icon name="cancel" size="18px" />}
                >
                  Confirmar rechazo
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

export default function PagoDetalleModal({
  isOpen,
  onClose,
  pagoId,
  comunidadNombre,
  onRevisionExitosa,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del pago" icon="receipt_long" size="lg">
      <PagoDetalleContenido
        pagoId={pagoId}
        comunidadNombre={comunidadNombre}
        onRevisionExitosa={onRevisionExitosa}
      />
    </Modal>
  );
}
