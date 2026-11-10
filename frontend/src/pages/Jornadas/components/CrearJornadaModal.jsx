import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { bombonaAdminKeys, useCreateJornada } from '../../../hooks/useBombonaAdminQueries';
import { buildCreateJornadaPayload, TIPOS_BOMBONA } from '../../../utils/bombonaAdmin';
import { crearJornadaSchema } from '../../../validations/bombonaAdmin';

const getDefaultValues = (comunidadId) => ({
  comunidad: comunidadId || '',
  precios: { grande: '', mediana: '', pequena: '' },
  pagoMovil: { banco: '', telefono: '', documento: '', titular: '' },
});

export default function CrearJornadaModal({
  isOpen,
  onClose,
  comunidadId,
  comunidadNombre,
  rol,
  onCreated,
}) {
  const queryClient = useQueryClient();
  const crearJornada = useCreateJornada();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(crearJornadaSchema),
    defaultValues: getDefaultValues(comunidadId),
  });

  useEffect(() => {
    if (isOpen) reset(getDefaultValues(comunidadId));
  }, [comunidadId, isOpen, reset]);

  const onSubmit = async (values) => {
    const payload = buildCreateJornadaPayload(
      { ...values, comunidad: comunidadId },
      { role: rol },
    );

    try {
      const result = await crearJornada.mutateAsync({ data: payload, comunidadId });
      toast.success('Jornada creada exitosamente.');
      reset(getDefaultValues(comunidadId));
      onCreated?.(result.jornada);
      onClose();
    } catch (error) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;

      if (code === 'JORNADA_ACTIVA_EXISTENTE') {
        toast.error(message || 'Ya existe una jornada activa para esta comunidad.');
        queryClient.invalidateQueries({ queryKey: bombonaAdminKeys.jornadaActiva(comunidadId) });
        onClose();
        return;
      }

      toast.error(message || 'No se pudo crear la jornada. Revise los datos e intente nuevamente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear jornada"
      icon="event_available"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
        <div className="flex items-center gap-sm rounded-lg border border-primary/20 bg-primary/5 p-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="location_city" size="22px" />
          </div>
          <div className="min-w-0">
            <p className="text-label-sm text-on-surface-variant">Comunidad</p>
            <p className="truncate text-label-lg font-bold text-on-surface">
              {comunidadNombre || 'Comunidad asignada'}
            </p>
          </div>
        </div>

        <section className="space-y-md">
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">Precios por presentación</h3>
            <p className="text-body-sm text-on-surface-variant">
              Montos en bolívares, con máximo dos decimales.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            {TIPOS_BOMBONA.map((tipo) => (
              <Input
                key={tipo.key}
                id={`precio-${tipo.key}`}
                label={tipo.label}
                icon="sell"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                error={errors.precios?.[tipo.key]?.message}
                {...register(`precios.${tipo.key}`, { valueAsNumber: true })}
              />
            ))}
          </div>
        </section>

        <section className="space-y-md">
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">Pago Móvil</h3>
            <p className="text-body-sm text-on-surface-variant">
              Datos que verán los habitantes en el formulario público.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Input
              id="banco"
              label="Banco"
              icon="account_balance"
              placeholder="Ej. Banesco"
              error={errors.pagoMovil?.banco?.message}
              {...register('pagoMovil.banco')}
            />
            <Input
              id="telefono"
              label="Teléfono"
              icon="call"
              placeholder="0414-1234567"
              error={errors.pagoMovil?.telefono?.message}
              {...register('pagoMovil.telefono')}
            />
            <Input
              id="documento"
              label="Documento"
              icon="badge"
              placeholder="V-12345678"
              error={errors.pagoMovil?.documento?.message}
              {...register('pagoMovil.documento')}
            />
            <Input
              id="titular"
              label="Titular"
              icon="person"
              placeholder="Nombre y apellido"
              error={errors.pagoMovil?.titular?.message}
              {...register('pagoMovil.titular')}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-sm border-t border-outline-variant/15 pt-md sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={crearJornada.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={crearJornada.isPending}
            disabled={crearJornada.isPending}
            icon={<Icon name="add" size="18px" />}
          >
            Crear jornada
          </Button>
        </div>
      </form>
    </Modal>
  );
}
