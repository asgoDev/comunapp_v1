import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import { useCloseJornada } from '../../../hooks/useBombonaAdminQueries';
import { cerrarJornadaSchema } from '../../../validations/bombonaAdmin';

export default function CerrarJornadaModal({
  isOpen,
  onClose,
  jornada,
  onClosed,
}) {
  const cerrarJornada = useCloseJornada();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(cerrarJornadaSchema),
    defaultValues: { motivo: '' },
  });
  const motivo = watch('motivo') || '';

  useEffect(() => {
    if (isOpen) reset({ motivo: '' });
  }, [isOpen, reset]);

  const onSubmit = async (values) => {
    try {
      const comunidadId = jornada.comunidad?._id || jornada.comunidad;
      await cerrarJornada.mutateAsync({
        id: jornada._id,
        data: values.motivo ? { motivo: values.motivo } : {},
        comunidadId,
      });
      toast.success('Jornada cerrada exitosamente.');
      reset({ motivo: '' });
      onClosed?.();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'No se pudo cerrar la jornada. Intente nuevamente.',
      );
    }
  };

  if (!jornada) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cerrar jornada" icon="lock" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
        <div className="flex items-start gap-sm rounded-lg border border-error/20 bg-error/5 p-md text-body-sm text-on-surface-variant">
          <Icon name="warning" size="22px" className="shrink-0 text-error" />
          <p>
            Al cerrar la jornada, el formulario público dejará de recibir pagos.
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="motivo" className="block text-label-lg text-on-surface-variant">
            Motivo (opcional)
          </label>
          <textarea
            id="motivo"
            rows={3}
            maxLength={300}
            placeholder="Ej. Fin de la distribución"
            className={`w-full rounded-lg border bg-surface-container-low px-4 py-3 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 ${
              errors.motivo ? 'border-error' : 'border-outline-variant/40'
            }`}
            {...register('motivo')}
          />
          <div className="flex items-center justify-between gap-sm">
            {errors.motivo ? (
              <p className="text-label-sm text-error">{errors.motivo.message}</p>
            ) : (
              <span className="text-label-sm text-on-surface-variant">
                Entre 5 y 300 caracteres si desea documentar el cierre.
              </span>
            )}
            <span className="shrink-0 text-label-sm text-on-surface-variant">{motivo.length}/300</span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-sm border-t border-outline-variant/15 pt-md sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={cerrarJornada.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={cerrarJornada.isPending}
            disabled={cerrarJornada.isPending}
            icon={<Icon name="lock" size="18px" />}
          >
            Cerrar jornada
          </Button>
        </div>
      </form>
    </Modal>
  );
}
