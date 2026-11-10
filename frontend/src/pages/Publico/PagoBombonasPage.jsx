import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { useBombonaJornadaActiva, useCrearPagoBombona } from '../../hooks/useBombonaPublicaQueries';
import { getBombonaErrorCode, getBombonaErrorMessage, mapBombonaApiErrors } from '../../utils/bombonaErrors';
import { comprimirComprobante } from '../../utils/bombonaImage';
import { createIdempotencyKey } from '../../utils/idempotencyKey';
import { pagoBombonasSchema } from '../../validations/pagoBombonas';

const TIPOS_BOMBONA = [
  { key: 'grande', nombre: 'Bombona grande', capacidad: '43 kg', icon: 'propane_tank' },
  { key: 'mediana', nombre: 'Bombona mediana', capacidad: '18 kg', icon: 'propane_tank' },
  { key: 'pequena', nombre: 'Bombona pequeña', capacidad: '10 kg', icon: 'propane_tank' },
];

const DEFAULT_VALUES = {
  calle: '',
  numeroCasa: '',
  propietario: '',
  referencia: '',
  comprobante: undefined,
  bombonas: { grande: 0, mediana: 0, pequena: 0 },
};

const formatVES = (amount) =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function PagoBombonasPage() {
  const { comunidadId } = useParams();
  const [confirmacion, setConfirmacion] = useState(null);
  const [jornadaCerrada, setJornadaCerrada] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [avisoArchivo, setAvisoArchivo] = useState('');
  const inputComprobanteRef = useRef(null);
  const vistaPreviaRef = useRef('');
  const seleccionArchivoRef = useRef(0);
  const intentoIdempotenciaRef = useRef(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useBombonaJornadaActiva(comunidadId);
  const registrarPago = useCrearPagoBombona();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting: isSubmittingForm },
  } = useForm({
    resolver: zodResolver(pagoBombonasSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const calleSeleccionada = watch('calle');
  const cantidades = watch('bombonas');
  const comprobante = watch('comprobante');
  const fileRegistration = register('comprobante');
  const viviendas = Array.isArray(data?.viviendas) ? data.viviendas : [];
  const viviendaSeleccionada = viviendas.find((vivienda) => vivienda.calle === calleSeleccionada);
  const casasDisponibles = viviendaSeleccionada?.casas || [];
  const maxPorTipo = data?.limites?.maxPorTipo ?? 10;
  const maxTotal = data?.limites?.maxTotal ?? 20;

  const resumen = useMemo(() => {
    const precios = data?.jornada?.precios || {};
    return TIPOS_BOMBONA.reduce(
      (acumulado, tipo) => {
        const cantidad = Number(cantidades?.[tipo.key]) || 0;
        const precio = Number(precios[tipo.key]) || 0;
        acumulado.items.push({ ...tipo, cantidad, precio, subtotal: cantidad * precio });
        acumulado.total += cantidad * precio;
        acumulado.cantidadTotal += cantidad;
        return acumulado;
      },
      { items: [], total: 0, cantidadTotal: 0 },
    );
  }, [cantidades, data?.jornada?.precios]);

  useEffect(() => () => {
    seleccionArchivoRef.current += 1;
    if (vistaPreviaRef.current) URL.revokeObjectURL(vistaPreviaRef.current);
    vistaPreviaRef.current = '';
  }, []);

  const actualizarVistaPrevia = (file) => {
    if (vistaPreviaRef.current) URL.revokeObjectURL(vistaPreviaRef.current);
    const nextUrl = file ? URL.createObjectURL(file) : '';
    vistaPreviaRef.current = nextUrl;
    setVistaPrevia(nextUrl);
  };

  const onComprobanteChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    const selectionId = ++seleccionArchivoRef.current;
    clearErrors('comprobante');
    setAvisoArchivo('');
    actualizarVistaPrevia('');
    setValue('comprobante', undefined, { shouldDirty: true, shouldValidate: false });

    if (!selectedFile) return;

    setComprimiendo(true);
    try {
      const result = await comprimirComprobante(selectedFile);
      if (selectionId !== seleccionArchivoRef.current) return;

      setValue('comprobante', result.file, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      actualizarVistaPrevia(result.file);
      setAvisoArchivo(
        result.optimized
          ? `Imagen optimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.uploadSize)}`
          : result.warning || `Tamaño listo para enviar: ${formatBytes(result.uploadSize)}`,
      );
    } catch (compressionError) {
      if (selectionId !== seleccionArchivoRef.current) return;
      setError('comprobante', {
        type: 'manual',
        message: compressionError.message || 'No se pudo preparar la imagen.',
      });
      toast.error(compressionError.message || 'No se pudo preparar la imagen.');
    } finally {
      if (selectionId === seleccionArchivoRef.current) {
        setComprimiendo(false);
        if (inputComprobanteRef.current) inputComprobanteRef.current.value = '';
      }
    }
  };

  const quitarComprobante = () => {
    seleccionArchivoRef.current += 1;
    setComprimiendo(false);
    actualizarVistaPrevia('');
    setAvisoArchivo('');
    setValue('comprobante', undefined, { shouldDirty: true, shouldValidate: true });
    clearErrors('comprobante');
    if (inputComprobanteRef.current) inputComprobanteRef.current.value = '';
  };

  const updateQuantity = (tipo, value) => {
    const actual = Number(cantidades?.[tipo]) || 0;
    const otros = resumen.cantidadTotal - actual;
    const maxDisponible = Math.max(0, Math.min(maxPorTipo, maxTotal - otros));
    const parsed = value === '' ? 0 : Number(value);
    const cantidad = Number.isFinite(parsed)
      ? Math.max(0, Math.min(maxDisponible, Math.floor(parsed)))
      : 0;
    setValue(`bombonas.${tipo}`, cantidad, { shouldDirty: true, shouldValidate: true });
  };

  const getAttemptKey = (formData) => {
    const fingerprint = JSON.stringify({
      comunidadId,
      calle: formData.calle,
      numeroCasa: formData.numeroCasa,
      propietario: formData.propietario.trim().replace(/\s+/g, ' '),
      referencia: formData.referencia.trim().toUpperCase(),
      bombonas: formData.bombonas,
      fileName: formData.comprobante.name,
      fileSize: formData.comprobante.size,
      fileLastModified: formData.comprobante.lastModified,
    });
    const previousAttempt = intentoIdempotenciaRef.current;
    if (
      previousAttempt?.fingerprint === fingerprint &&
      previousAttempt.file === formData.comprobante
    ) {
      return previousAttempt.key;
    }

    const nextAttempt = {
      fingerprint,
      file: formData.comprobante,
      key: createIdempotencyKey(),
    };
    intentoIdempotenciaRef.current = nextAttempt;
    return nextAttempt.key;
  };

  const onSubmit = async (formData) => {
    const total = Object.values(formData.bombonas).reduce((sum, quantity) => sum + quantity, 0);
    for (const tipo of TIPOS_BOMBONA) {
      if (formData.bombonas[tipo.key] > maxPorTipo) {
        setError(`bombonas.${tipo.key}`, {
          type: 'server',
          message: `El máximo por tipo es ${maxPorTipo}.`,
        });
        return;
      }
    }
    if (total > maxTotal) {
      setError('bombonas.grande', {
        type: 'server',
        message: `El máximo total por jornada es ${maxTotal}.`,
      });
      return;
    }

    const submittedDetails = {
      comunidad: data.comunidad.nombre,
      calle: formData.calle,
      numeroCasa: formData.numeroCasa,
      propietario: formData.propietario.trim(),
      referencia: formData.referencia.trim().toUpperCase(),
      bombonas: { ...formData.bombonas },
    };

    try {
      const idempotencyKey = getAttemptKey(formData);
      const response = await registrarPago.mutateAsync({
        comunidadId,
        data: formData,
        idempotencyKey,
      });

      setConfirmacion({ ...submittedDetails, pago: response.pago });
      reset(DEFAULT_VALUES);
      actualizarVistaPrevia('');
      setAvisoArchivo('');
      intentoIdempotenciaRef.current = null;
      registrarPago.reset();
      toast.success('Solicitud registrada exitosamente.');
    } catch (submitError) {
      mapBombonaApiErrors(submitError.response?.data?.errors, setError);
      const code = getBombonaErrorCode(submitError);
      const message = getBombonaErrorMessage(submitError);

      if (code === 'REFERENCIA_DUPLICADA') {
        setError('referencia', { type: 'server', message });
      }
      if (code === 'JORNADA_NO_ACTIVA') {
        setJornadaCerrada(true);
        refetch();
      }
      toast.error(message);
      registrarPago.reset();
    }
  };

  const copiarDatoPago = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  };

  const startNewRequest = () => {
    reset(DEFAULT_VALUES);
    actualizarVistaPrevia('');
    setAvisoArchivo('');
    setConfirmacion(null);
    setJornadaCerrada(false);
    intentoIdempotenciaRef.current = null;
    registrarPago.reset();
    refetch();
  };

  const pageFrame = (content) => (
    <div className="min-h-screen bg-background font-montserrat">
      <header className="bg-gradient-to-r from-primary to-primary-container px-margin-mobile py-5 text-on-primary sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-md">
          <Logo size="text-3xl" />
          <div className="hidden items-center gap-xs text-label-sm text-on-primary/80 sm:flex">
            <Icon name="lock_open" size="18px" />
            Formulario público
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-lg px-margin-mobile py-8 sm:px-8 lg:py-10">
        {content}
      </main>
    </div>
  );

  const statusPanel = ({ icon, title, message, action }) => (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-lg text-center shadow-sm sm:p-8">
      <div className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} size="30px" />
      </div>
      <h1 className="text-headline-md font-bold text-on-surface">{title}</h1>
      <p className="mx-auto mt-sm max-w-lg text-body-md text-on-surface-variant">{message}</p>
      {action && <div className="mt-lg flex justify-center">{action}</div>}
    </section>
  );

  if (isLoading) {
    return pageFrame(
      <div className="mx-auto w-full max-w-3xl animate-pulse space-y-md">
        <div className="h-8 w-2/3 rounded-lg bg-surface-container" />
        <div className="h-5 w-full max-w-xl rounded-lg bg-surface-container" />
        <div className="h-48 rounded-xl bg-surface-container-lowest" />
        <div className="h-64 rounded-xl bg-surface-container-lowest" />
      </div>,
    );
  }

  if (jornadaCerrada || (isError && getBombonaErrorCode(error) === 'JORNADA_NO_ACTIVA')) {
    return pageFrame(statusPanel({
      icon: 'event_busy',
      title: 'No hay jornadas activas',
      message: `En este momento no hay jornadas de bombonas activas para ${data?.comunidad?.nombre || 'esta comunidad'}.`,
      action: (
        <Button type="button" variant="outline" loading={isFetching} onClick={() => refetch()} icon={<Icon name="refresh" size="18px" />}>
          Volver a consultar
        </Button>
      ),
    }));
  }

  if (!data) {
    const invalidLink = error?.response?.status === 400;
    return pageFrame(statusPanel({
      icon: invalidLink ? 'link_off' : 'cloud_off',
      title: invalidLink ? 'Enlace no válido' : 'No se pudo cargar la jornada',
      message: invalidLink
        ? 'El enlace de esta comunidad no es válido.'
        : 'No fue posible consultar la información. Revise su conexión e intente nuevamente.',
      action: (
        <Button type="button" variant="outline" loading={isFetching} onClick={() => refetch()} icon={<Icon name="refresh" size="18px" />}>
          Reintentar
        </Button>
      ),
    }));
  }

  if (confirmacion) {
    return pageFrame(
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
          <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-on-primary sm:p-8">
            <div className="flex items-center gap-md">
              <div className="rounded-full bg-on-primary/10 p-md">
                <Icon name="check_circle" size="34px" />
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Pago enviado</p>
                <h1 className="text-headline-md font-bold">Solicitud registrada</h1>
              </div>
            </div>
          </div>
          <div className="space-y-lg p-lg sm:p-8">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-md">
              <p className="text-body-sm text-on-surface-variant">Su pago quedó pendiente de verificación por la comunidad.</p>
              <p className="mt-1 text-label-lg font-bold text-on-surface">Código de seguimiento: {confirmacion.pago.codigoSeguimiento}</p>
            </div>
            <dl className="grid grid-cols-1 gap-md text-body-sm sm:grid-cols-2">
              <div><dt className="text-on-surface-variant">Comunidad</dt><dd className="font-semibold text-on-surface">{confirmacion.comunidad}</dd></div>
              <div><dt className="text-on-surface-variant">Vivienda</dt><dd className="font-semibold text-on-surface">{confirmacion.calle} · Casa {confirmacion.numeroCasa}</dd></div>
              <div><dt className="text-on-surface-variant">Propietario</dt><dd className="font-semibold text-on-surface">{confirmacion.propietario}</dd></div>
              <div><dt className="text-on-surface-variant">Referencia</dt><dd className="font-semibold text-on-surface">{confirmacion.referencia}</dd></div>
            </dl>
            <div className="flex items-center justify-between rounded-lg bg-surface-container p-md">
              <span className="text-label-lg text-on-surface-variant">Total enviado</span>
              <span className="text-headline-sm font-bold text-primary">{formatVES(confirmacion.pago.total)}</span>
            </div>
            <Button type="button" onClick={startNewRequest} className="w-full" icon={<Icon name="refresh" size="20px" />}>
              Registrar otra solicitud
            </Button>
          </div>
        </section>
      </div>,
    );
  }

  if (viviendas.length === 0) {
    return pageFrame(statusPanel({
      icon: 'home_work',
      title: 'No hay viviendas disponibles',
      message: `La comunidad ${data.comunidad.nombre} no tiene viviendas con numeración válida para esta jornada.`,
      action: (
        <Button type="button" variant="outline" loading={isFetching} onClick={() => refetch()} icon={<Icon name="refresh" size="18px" />}>
          Volver a consultar
        </Button>
      ),
    }));
  }

  const calleRegistration = register('calle');
  const isSubmitting = isSubmittingForm || registrarPago.isPending;

  return pageFrame(
    <>
      <div className="space-y-2">
        <p className="text-label-lg font-semibold uppercase tracking-wider text-primary">Registro de pago</p>
        <h1 className="text-headline-lg font-bold text-on-surface sm:text-display-lg">Solicitud de bombonas</h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Seleccione su vivienda, indique el requerimiento y complete los datos del pago realizado.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-[minmax(0,1fr)_330px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
          <fieldset disabled={isSubmitting || comprimiendo} className="space-y-lg disabled:opacity-80">
            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-primary/10 p-sm text-primary"><Icon name="home_work" size="24px" /></div>
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Datos de la vivienda</h2>
                  <p className="text-body-sm text-on-surface-variant">Información de la comunidad y la casa solicitante.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-lg p-lg sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-label-lg text-on-surface-variant">Comunidad</label>
                  <div className="flex min-h-[48px] items-center gap-xs rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-body-md font-semibold text-on-surface">
                    <Icon name="location_city" size="20px" className="text-primary" />
                    {data.comunidad.nombre}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="calle" className="block text-label-lg text-on-surface-variant">
                    Calle <span className="font-bold text-error">*</span>
                  </label>
                  <select
                    id="calle"
                    className={`w-full rounded-lg border bg-surface-container-low px-4 py-3 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 ${errors.calle ? 'border-error' : 'border-outline-variant/40'}`}
                    {...calleRegistration}
                    onChange={(event) => {
                      calleRegistration.onChange(event);
                      setValue('numeroCasa', '', { shouldDirty: true, shouldValidate: true });
                    }}
                    aria-invalid={Boolean(errors.calle)}
                  >
                    <option value="">Seleccione su calle...</option>
                    {viviendas.map(({ calle }) => <option key={calle} value={calle}>{calle}</option>)}
                  </select>
                  {errors.calle && <p className="text-label-sm text-error">{errors.calle.message}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="numeroCasa" className="block text-label-lg text-on-surface-variant">
                    Número de casa <span className="font-bold text-error">*</span>
                  </label>
                  <select
                    id="numeroCasa"
                    disabled={!calleSeleccionada}
                    className={`w-full rounded-lg border bg-surface-container-low px-4 py-3 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${errors.numeroCasa ? 'border-error' : 'border-outline-variant/40'}`}
                    {...register('numeroCasa')}
                    aria-invalid={Boolean(errors.numeroCasa)}
                  >
                    <option value="">{calleSeleccionada ? 'Seleccione su casa...' : 'Primero seleccione una calle'}</option>
                    {casasDisponibles.map((casa) => <option key={casa} value={casa}>Casa {casa}</option>)}
                  </select>
                  {errors.numeroCasa && <p className="text-label-sm text-error">{errors.numeroCasa.message}</p>}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-secondary-container/40 p-sm text-secondary"><Icon name="propane_tank" size="24px" /></div>
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Requerimiento de bombonas</h2>
                  <p className="text-body-sm text-on-surface-variant">Indique la cantidad por presentación.</p>
                </div>
              </div>
              <div className="space-y-md p-lg">
                {TIPOS_BOMBONA.map((tipo) => {
                  const cantidad = Number(cantidades?.[tipo.key]) || 0;
                  const otros = resumen.cantidadTotal - cantidad;
                  const maxActual = Math.max(0, Math.min(maxPorTipo, maxTotal - otros));
                  const quantityField = register(`bombonas.${tipo.key}`, { valueAsNumber: true });
                  const error = errors.bombonas?.[tipo.key]?.message;

                  return (
                    <div key={tipo.key}>
                      <div className="flex items-center justify-between gap-md rounded-lg border border-outline-variant/20 bg-surface-container-low p-md">
                        <div className="flex min-w-0 items-center gap-md">
                          <div className="rounded-full bg-primary/10 p-sm text-primary"><Icon name={tipo.icon} size="24px" /></div>
                          <div className="min-w-0">
                            <h3 className="truncate text-label-lg font-bold text-on-surface">{tipo.nombre}</h3>
                            <p className="text-label-sm text-on-surface-variant">{tipo.capacidad} · {formatVES(resumen.items.find((item) => item.key === tipo.key)?.precio)} c/u</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-1">
                          <button type="button" title={`Disminuir ${tipo.nombre}`} aria-label={`Disminuir ${tipo.nombre}`} disabled={cantidad === 0} onClick={() => updateQuantity(tipo.key, cantidad - 1)} className="flex h-9 w-9 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30">
                            <Icon name="remove" size="20px" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={maxActual}
                            inputMode="numeric"
                            aria-label={`Cantidad de ${tipo.nombre}`}
                            className="h-9 w-12 border-0 bg-transparent text-center text-body-md font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                            {...quantityField}
                            value={cantidad}
                            onChange={(event) => updateQuantity(tipo.key, event.target.value)}
                          />
                          <button type="button" title={`Aumentar ${tipo.nombre}`} aria-label={`Aumentar ${tipo.nombre}`} disabled={cantidad >= maxActual || resumen.cantidadTotal >= maxTotal} onClick={() => updateQuantity(tipo.key, cantidad + 1)} className="flex h-9 w-9 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30">
                            <Icon name="add" size="20px" />
                          </button>
                        </div>
                      </div>
                      {error && <p className="mt-1 text-label-sm text-error">{error}</p>}
                    </div>
                  );
                })}
                {errors.bombonas?.message && <p className="text-label-sm text-error">{errors.bombonas.message}</p>}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-primary/10 p-sm text-primary"><Icon name="receipt_long" size="24px" /></div>
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Datos del pago</h2>
                  <p className="text-body-sm text-on-surface-variant">Complete la información del propietario y la referencia.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-lg p-lg sm:grid-cols-2">
                <Input
                  id="propietario"
                  label={<span>Propietario de la bombona <span className="font-bold text-error">*</span></span>}
                  icon="person"
                  placeholder="Nombre y apellido"
                  error={errors.propietario?.message}
                  aria-label="Propietario de la bombona"
                  autoComplete="name"
                  {...register('propietario')}
                />
                <Input
                  id="referencia"
                  label={<span>Número de referencia <span className="font-bold text-error">*</span></span>}
                  icon="tag"
                  placeholder="Ej. 0123456789"
                  error={errors.referencia?.message}
                  aria-label="Número de referencia"
                  {...register('referencia')}
                />

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="comprobante" className="block text-label-lg text-on-surface-variant">
                    Comprobante de pago <span className="font-bold text-error">*</span>
                  </label>
                  <div className={`rounded-lg border border-dashed bg-surface-container-low p-md ${errors.comprobante ? 'border-error' : 'border-outline-variant/40'}`}>
                    <input
                      id="comprobante"
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="sr-only"
                      name={fileRegistration.name}
                      onBlur={fileRegistration.onBlur}
                      ref={(node) => {
                        fileRegistration.ref(node);
                        inputComprobanteRef.current = node;
                      }}
                      onChange={onComprobanteChange}
                      aria-invalid={Boolean(errors.comprobante)}
                    />
                    <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-md">
                        <div className="rounded-full bg-primary/10 p-sm text-primary"><Icon name="upload_file" size="24px" /></div>
                        <div className="min-w-0">
                          <p className="text-label-lg font-semibold text-on-surface">{comprimiendo ? 'Optimizando imagen...' : (comprobante ? comprobante.name : 'JPG o PNG · máximo 5 MiB')}</p>
                          <p className="text-label-sm text-on-surface-variant" aria-live="polite">
                            {comprimiendo ? 'Espere mientras reducimos el tamaño sin perder legibilidad.' : (avisoArchivo || 'La imagen se comprime en este dispositivo antes de enviarse.')}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-xs">
                        {comprobante && (
                          <button type="button" title="Quitar comprobante" aria-label="Quitar comprobante" onClick={quitarComprobante} className="flex h-10 w-10 items-center justify-center rounded-lg text-error hover:bg-error/10">
                            <Icon name="delete" size="20px" />
                          </button>
                        )}
                        <label htmlFor="comprobante" className="inline-flex cursor-pointer items-center justify-center gap-xs rounded-lg border border-outline-variant px-md py-2 text-label-lg text-on-surface-variant hover:bg-outline-variant/10">
                          <Icon name="attach_file" size="18px" />
                          {comprobante ? 'Cambiar imagen' : 'Seleccionar imagen'}
                        </label>
                      </div>
                    </div>
                    {vistaPrevia && (
                      <div className="mt-md flex items-start gap-md rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-sm">
                        <img src={vistaPrevia} alt="Vista previa del comprobante optimizado" className="h-24 w-24 rounded-md border border-outline-variant/20 object-contain" />
                        <div className="text-label-sm text-on-surface-variant">
                          <p className="font-semibold text-on-surface">Vista previa lista para enviar</p>
                          <p>{formatBytes(comprobante?.size || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.comprobante && <p className="text-label-sm text-error">{errors.comprobante.message}</p>}
                </div>
              </div>
            </section>

            <Button
              type="submit"
              loading={isSubmitting || registrarPago.isPending || comprimiendo}
              disabled={isSubmitting || registrarPago.isPending || comprimiendo}
              className="w-full py-3.5 text-body-md sm:w-auto sm:min-w-[240px]"
              icon={<Icon name="send" size="20px" />}
            >
              Registrar solicitud
            </Button>
          </fieldset>
        </form>

        <aside className="space-y-md lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-xl border border-primary/20 bg-surface-container-lowest shadow-sm">
            <div className="bg-gradient-to-r from-primary to-primary-container p-lg text-on-primary">
              <div className="flex items-center justify-between gap-md">
                <div>
                  <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Resumen</p>
                  <h2 className="text-headline-sm font-bold">Total estimado</h2>
                </div>
                <Icon name="payments" size="30px" />
              </div>
              <p className="mt-4 text-headline-lg font-bold" aria-live="polite">{formatVES(resumen.total)}</p>
            </div>
            <div className="space-y-md p-lg">
              {resumen.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-md text-body-sm">
                  <span className="text-on-surface-variant">{item.nombre}</span>
                  <span className="font-semibold text-on-surface">{item.cantidad} × {formatVES(item.precio)}</span>
                </div>
              ))}
              <div className="border-t border-outline-variant/20 pt-md text-label-lg text-on-surface-variant">
                {resumen.cantidadTotal} {resumen.cantidadTotal === 1 ? 'bombona solicitada' : 'bombonas solicitadas'}
              </div>
            </div>
          </section>

          <section className="space-y-sm rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-lg">
            <div className="flex items-center gap-xs text-primary"><Icon name="account_balance" size="20px" /><h2 className="text-label-lg font-bold">Pago móvil</h2></div>
            <dl className="space-y-xs text-body-sm">
              <div className="flex justify-between gap-md"><dt className="text-on-surface-variant">Banco</dt><dd className="text-right font-semibold text-on-surface">{data.jornada.pagoMovil.banco}</dd></div>
              <div className="flex items-center justify-between gap-md">
                <dt className="text-on-surface-variant">Teléfono</dt>
                <dd className="flex items-center gap-xs text-right font-semibold text-on-surface">
                  {data.jornada.pagoMovil.telefono}
                  <button type="button" title="Copiar teléfono" aria-label="Copiar teléfono de Pago Móvil" onClick={() => copiarDatoPago(data.jornada.pagoMovil.telefono, 'Teléfono')} className="rounded p-xs text-primary hover:bg-primary/10">
                    <Icon name="content_copy" size="16px" />
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-md">
                <dt className="text-on-surface-variant">Documento</dt>
                <dd className="flex items-center gap-xs text-right font-semibold text-on-surface">
                  {data.jornada.pagoMovil.documento}
                  <button type="button" title="Copiar documento" aria-label="Copiar documento de Pago Móvil" onClick={() => copiarDatoPago(data.jornada.pagoMovil.documento, 'Documento')} className="rounded p-xs text-primary hover:bg-primary/10">
                    <Icon name="content_copy" size="16px" />
                  </button>
                </dd>
              </div>
              <div className="flex justify-between gap-md"><dt className="text-on-surface-variant">Titular</dt><dd className="text-right font-semibold text-on-surface">{data.jornada.pagoMovil.titular}</dd></div>
            </dl>
          </section>

          <div className="flex gap-xs rounded-lg border border-secondary/20 bg-secondary-container/20 p-md text-label-sm text-on-surface-variant">
            <Icon name="info" size="18px" className="shrink-0 text-secondary" />
            <p>El total mostrado es estimado. El servidor vuelve a calcularlo con los precios vigentes de la jornada.</p>
          </div>
        </aside>
      </div>
    </>,
  );
}
