import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { pagoBombonasSchema } from '../../validations/pagoBombonas';

const COMUNIDADES_DEMO = {
  demo: {
    nombre: 'Comunidad Las Acacias',
    casas: ['1', '2', '3', '4', '5', '8', '10', '12', '14', '18', '20', '24'],
    precios: { grande: 250, mediana: 180, pequena: 120 },
  },
  'comunidad-prueba': {
    nombre: 'Comunidad Brisas del Este',
    casas: ['1', '2', '6', '7', '11', '15', '16', '21', '25', '30'],
    precios: { grande: 260, mediana: 190, pequena: 130 },
  },
};

const COMUNIDAD_POR_DEFECTO = {
  nombre: 'Comunidad de prueba',
  casas: ['1', '2', '3', '4', '5', '8', '10', '12', '14', '18'],
  precios: { grande: 250, mediana: 180, pequena: 120 },
};

const TIPOS_BOMBONA = [
  {
    key: 'grande',
    nombre: 'Bombona grande',
    capacidad: '43 kg',
    icon: 'propane_tank',
  },
  {
    key: 'mediana',
    nombre: 'Bombona mediana',
    capacidad: '18 kg',
    icon: 'propane_tank',
  },
  {
    key: 'pequena',
    nombre: 'Bombona pequeña',
    capacidad: '10 kg',
    icon: 'propane_tank',
  },
];

const DEFAULT_VALUES = {
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
  }).format(amount);

export default function PagoBombonasPage() {
  const { comunidadId } = useParams();
  const [submittedData, setSubmittedData] = useState(null);
  const comunidad = COMUNIDADES_DEMO[comunidadId] || COMUNIDAD_POR_DEFECTO;
  const casasDisponibles = comunidad.casas.filter((casa) => /^\d+$/.test(casa));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pagoBombonasSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const cantidades = watch('bombonas');
  const comprobanteSeleccionado = watch('comprobante')?.[0]?.name;

  const resumen = useMemo(() => {
    return TIPOS_BOMBONA.reduce(
      (accumulator, tipo) => {
        const cantidad = Number(cantidades?.[tipo.key]) || 0;
        const subtotal = cantidad * comunidad.precios[tipo.key];

        accumulator.items.push({ ...tipo, cantidad, subtotal });
        accumulator.total += subtotal;
        accumulator.cantidadTotal += cantidad;
        return accumulator;
      },
      { items: [], total: 0, cantidadTotal: 0 }
    );
  }, [cantidades, comunidad.precios]);

  const updateQuantity = (tipo, value) => {
    const quantity = Math.max(0, Math.min(20, Number(value) || 0));
    setValue(`bombonas.${tipo}`, quantity, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = (data) => {
    setSubmittedData({
      ...data,
      total: resumen.total,
      cantidadTotal: resumen.cantidadTotal,
      nombreComunidad: comunidad.nombre,
      comprobanteNombre: data.comprobante?.[0]?.name,
    });
    toast.success('Solicitud registrada en modo demostración.');
  };

  const startNewRequest = () => {
    reset(DEFAULT_VALUES);
    setSubmittedData(null);
  };

  if (submittedData) {
    return (
      <div className="min-h-screen bg-background px-margin-mobile py-8 font-montserrat sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
          <section className="w-full overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
            <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-on-primary sm:p-8">
              <div className="flex items-center gap-md">
                <div className="rounded-full bg-on-primary/10 p-md">
                  <Icon name="check_circle" size="34px" />
                </div>
                <div>
                  <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Demostración</p>
                  <h1 className="text-headline-md font-bold">Solicitud registrada</h1>
                </div>
              </div>
            </div>

            <div className="space-y-lg p-lg sm:p-8">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-md">
                <p className="text-body-sm text-on-surface-variant">Esta confirmación es únicamente visual.</p>
                <p className="mt-1 text-label-lg text-on-surface">
                  El formulario todavía no envía información al servidor.
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-md text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">Comunidad</dt>
                  <dd className="font-semibold text-on-surface">{submittedData.nombreComunidad}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Número de casa</dt>
                  <dd className="font-semibold text-on-surface">Casa {submittedData.numeroCasa}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Propietario</dt>
                  <dd className="font-semibold text-on-surface">{submittedData.propietario}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Referencia</dt>
                  <dd className="font-semibold text-on-surface">{submittedData.referencia}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between rounded-lg bg-surface-container p-md">
                <span className="text-label-lg text-on-surface-variant">Total a pagar</span>
                <span className="text-headline-sm font-bold text-primary">{formatVES(submittedData.total)}</span>
              </div>

              <Button type="button" onClick={startNewRequest} className="w-full" icon={<Icon name="refresh" size="20px" />}>
                Registrar otra solicitud
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
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

      <main className="mx-auto max-w-6xl space-y-lg px-margin-mobile py-8 sm:px-8 lg:py-10">
        <div className="space-y-2">
          <p className="text-label-lg font-semibold uppercase tracking-wider text-primary">Registro de pago</p>
          <h1 className="text-headline-lg font-bold text-on-surface sm:text-display-lg">Solicitud de bombonas</h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Seleccione su vivienda, indique el requerimiento y complete los datos del pago realizado.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-[minmax(0,1fr)_330px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-primary/10 p-sm text-primary">
                  <Icon name="home_work" size="24px" />
                </div>
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
                    {comunidad.nombre}
                  </div>
                  <p className="text-label-sm text-on-surface-variant">Comunidad seleccionada desde el enlace.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="numeroCasa" className="block text-label-lg text-on-surface-variant">
                    Número de casa <span className="font-bold text-error">*</span>
                  </label>
                  <div className="relative">
                    <Icon name="home" size="20px" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <select
                      id="numeroCasa"
                      className={`w-full appearance-none rounded-lg border bg-surface-container-low px-4 py-3 pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 ${
                        errors.numeroCasa ? 'border-error' : 'border-outline-variant/40'
                      }`}
                      {...register('numeroCasa')}
                    >
                      <option value="">Seleccione su casa...</option>
                      {casasDisponibles.map((casa) => (
                        <option key={casa} value={casa}>
                          Casa {casa}
                        </option>
                      ))}
                    </select>
                    <Icon name="arrow_drop_down" size="22px" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                  </div>
                  {errors.numeroCasa && <p className="text-label-sm text-error">{errors.numeroCasa.message}</p>}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-secondary-container/40 p-sm text-secondary">
                  <Icon name="propane_tank" size="24px" />
                </div>
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Requerimiento de bombonas</h2>
                  <p className="text-body-sm text-on-surface-variant">Indique la cantidad que desea solicitar por presentación.</p>
                </div>
              </div>

              <div className="space-y-md p-lg">
                {TIPOS_BOMBONA.map((tipo) => {
                  const cantidad = Number(cantidades?.[tipo.key]) || 0;
                  const quantityField = register(`bombonas.${tipo.key}`, { valueAsNumber: true });

                  return (
                    <div key={tipo.key} className="flex items-center justify-between gap-md rounded-lg border border-outline-variant/20 bg-surface-container-low p-md">
                      <div className="flex min-w-0 items-center gap-md">
                        <div className="rounded-full bg-primary/10 p-sm text-primary">
                          <Icon name={tipo.icon} size="24px" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-label-lg font-bold text-on-surface">{tipo.nombre}</h3>
                          <p className="text-label-sm text-on-surface-variant">{tipo.capacidad} · {formatVES(comunidad.precios[tipo.key])} c/u</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-1">
                        <button
                          type="button"
                          title={`Disminuir ${tipo.nombre}`}
                          aria-label={`Disminuir ${tipo.nombre}`}
                          disabled={cantidad === 0}
                          onClick={() => updateQuantity(tipo.key, cantidad - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Icon name="remove" size="20px" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          inputMode="numeric"
                          aria-label={`Cantidad de ${tipo.nombre}`}
                          className="h-9 w-12 border-0 bg-transparent text-center text-body-md font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                          {...quantityField}
                          value={cantidad}
                          onChange={(event) => updateQuantity(tipo.key, event.target.value)}
                        />
                        <button
                          type="button"
                          title={`Aumentar ${tipo.nombre}`}
                          aria-label={`Aumentar ${tipo.nombre}`}
                          disabled={cantidad === 20}
                          onClick={() => updateQuantity(tipo.key, cantidad + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Icon name="add" size="20px" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {errors.bombonas && <p className="text-label-sm text-error">{errors.bombonas.message}</p>}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-md border-b border-outline-variant/15 bg-surface-container-low p-lg">
                <div className="rounded-lg bg-primary/10 p-sm text-primary">
                  <Icon name="receipt_long" size="24px" />
                </div>
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Datos del pago</h2>
                  <p className="text-body-sm text-on-surface-variant">Complete la información del propietario y la referencia.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-lg p-lg sm:grid-cols-2">
                <Input
                  label={<span>Propietario de la bombona <span className="font-bold text-error">*</span></span>}
                  icon="person"
                  placeholder="Nombre y apellido"
                  error={errors.propietario?.message}
                  autoComplete="name"
                  {...register('propietario')}
                />

                <Input
                  label={<span>Número de referencia <span className="font-bold text-error">*</span></span>}
                  icon="tag"
                  placeholder="Ej. 0123456789"
                  error={errors.referencia?.message}
                  {...register('referencia')}
                />

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="comprobante" className="block text-label-lg text-on-surface-variant">
                    Comprobante de pago <span className="font-bold text-error">*</span>
                  </label>
                  <div className={`rounded-lg border border-dashed bg-surface-container-low p-md transition-colors hover:border-primary ${errors.comprobante ? 'border-error' : 'border-outline-variant/40'}`}>
                    <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-md">
                        <div className="rounded-full bg-primary/10 p-sm text-primary">
                          <Icon name="upload_file" size="24px" />
                        </div>
                        <div>
                          <p className="text-label-lg font-semibold text-on-surface">Cargue el comprobante</p>
                          <p className="text-label-sm text-on-surface-variant">
                            {comprobanteSeleccionado || 'JPG, PNG o PDF · máximo 5 MB'}
                          </p>
                        </div>
                      </div>
                      <label htmlFor="comprobante" className="inline-flex cursor-pointer items-center justify-center gap-xs rounded-lg border border-outline-variant px-md py-2 text-label-lg text-on-surface-variant transition-colors hover:bg-outline-variant/10">
                        <Icon name="attach_file" size="18px" />
                        Seleccionar archivo
                      </label>
                    </div>
                    <input id="comprobante" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="sr-only" {...register('comprobante')} />
                  </div>
                  {errors.comprobante && <p className="text-label-sm text-error">{errors.comprobante.message}</p>}
                </div>
              </div>
            </section>

            <Button type="submit" loading={isSubmitting} className="w-full py-3.5 text-body-md sm:w-auto sm:min-w-[240px]" icon={<Icon name="send" size="20px" />}>
              Registrar solicitud
            </Button>
          </form>

          <aside className="space-y-md lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-xl border border-primary/20 bg-surface-container-lowest shadow-sm">
              <div className="bg-gradient-to-r from-primary to-primary-container p-lg text-on-primary">
                <div className="flex items-center justify-between gap-md">
                  <div>
                    <p className="text-label-sm uppercase tracking-wider text-on-primary/70">Resumen</p>
                    <h2 className="text-headline-sm font-bold">Total a pagar</h2>
                  </div>
                  <Icon name="payments" size="30px" />
                </div>
                <p className="mt-4 text-headline-lg font-bold">{formatVES(resumen.total)}</p>
              </div>

              <div className="space-y-md p-lg">
                {resumen.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-md text-body-sm">
                    <span className="text-on-surface-variant">{item.nombre}</span>
                    <span className="font-semibold text-on-surface">{item.cantidad} × {formatVES(comunidad.precios[item.key])}</span>
                  </div>
                ))}
                <div className="border-t border-outline-variant/20 pt-md text-label-lg text-on-surface-variant">
                  {resumen.cantidadTotal} {resumen.cantidadTotal === 1 ? 'bombona solicitada' : 'bombonas solicitadas'}
                </div>
              </div>
            </section>

            <div className="flex gap-xs rounded-lg border border-secondary/20 bg-secondary-container/20 p-md text-label-sm text-on-surface-variant">
              <Icon name="info" size="18px" className="shrink-0 text-secondary" />
              <p>Los precios mostrados son referenciales y pertenecen únicamente a esta vista de prueba.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
