import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { useComunidadStore } from '../../stores/comunidadStore';
import { createComunidadSchema, updateComunidadSchema } from '../../validations/comunidad.js';
import venezuelaData from '../../utils/venezuela.json';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function ComunidadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { createComunidad, updateComunidad, fetchComunidadById, isLoading } = useComunidadStore();

  const isEditMode = !!id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEditMode ? updateComunidadSchema : createComunidadSchema),
    defaultValues: {
      nombre: '',
      municipio: '',
      estado: '',
      parroquia: '',
      ciudadPueblo: '',
      circuitoComuna: '',
    },
  });

  const watchEstado = watch('estado');
  const watchMunicipio = watch('municipio');

  const selectedEstadoObj = venezuelaData.find((e) => e.estado === watchEstado);
  const municipiosList = selectedEstadoObj ? selectedEstadoObj.municipios : [];

  const selectedMunicipioObj = municipiosList.find((m) => m.municipio === watchMunicipio);
  const parroquiasList = selectedMunicipioObj ? selectedMunicipioObj.parroquias : [];

  // Solo el administrador puede crear o editar comunidades
  if (!currentUser || currentUser.role !== 'admin') {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  // Cargar datos en modo edición
  useEffect(() => {
    if (isEditMode) {
      fetchComunidadById(id)
        .then((data) => {
          reset({
            nombre: data.nombre || '',
            municipio: data.municipio || '',
            estado: data.estado || '',
            parroquia: data.parroquia || '',
            ciudadPueblo: data.ciudadPueblo || '',
            circuitoComuna: data.circuitoComuna || '',
          });
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error al cargar la información de la comunidad.');
          navigate('/comunidades');
        });
    }
  }, [id, isEditMode, fetchComunidadById, navigate, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditMode) {
        await updateComunidad(id, data);
        toast.success('Comunidad actualizada exitosamente.');
      } else {
        await createComunidad(data);
        toast.success('Comunidad registrada exitosamente.');
      }
      navigate('/comunidades');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la comunidad.');
    }
  };

  const getPageTitle = () => {
    return isEditMode ? 'Actualizar Comunidad' : 'Registro de Nueva Comunidad';
  };

  const getPageSubtitle = () => {
    return isEditMode
      ? 'Modifique los campos necesarios para actualizar la comunidad territorial.'
      : 'Complete los campos obligatorios para registrar una nueva comunidad en el sistema.';
  };

  return (
    <div className="space-y-lg animate-fade-in-up max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          onClick={() => navigate('/comunidades')}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>Volver a Comunidades</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-white/10 rounded-xl">
              <Icon name={isEditMode ? 'edit_location_alt' : 'add_location_alt'} size="28px" />
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md font-bold">{getPageTitle()}</h2>
              <p className="text-body-sm text-white/80 mt-0.5">{getPageSubtitle()}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-lg space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Nombre */}
            <Input
              label="Nombre de la Comunidad"
              icon="home"
              placeholder="Ej. Urb. José L. Chirino"
              error={errors.nombre?.message}
              required
              {...register('nombre')}
            />



            {/* Estado */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Estado <span className="text-error font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="map" size="20px" />
                </span>
                <select
                  className={`
                    w-full bg-surface-container-low border rounded-lg
                    pl-10 pr-10 py-3 text-body-md text-on-surface
                    font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all duration-200 appearance-none cursor-pointer
                    ${errors.estado ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                  `}
                  required
                  {...register('estado', {
                    onChange: () => {
                      setValue('municipio', '');
                      setValue('parroquia', '');
                    }
                  })}
                >
                  <option value="">Seleccione un estado...</option>
                  {venezuelaData.map((e) => (
                    <option key={e.estado} value={e.estado}>
                      {e.estado}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="arrow_drop_down" />
                </span>
              </div>
              {errors.estado && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {errors.estado.message}
                </p>
              )}
            </div>

            {/* Municipio */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Municipio <span className="text-error font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="public" size="20px" />
                </span>
                <select
                  className={`
                    w-full bg-surface-container-low border rounded-lg
                    pl-10 pr-10 py-3 text-body-md text-on-surface
                    font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all duration-200 appearance-none cursor-pointer
                    ${errors.municipio ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                  `}
                  required
                  disabled={!watchEstado}
                  {...register('municipio', {
                    onChange: () => {
                      setValue('parroquia', '');
                    }
                  })}
                >
                  <option value="">Seleccione un municipio...</option>
                  {municipiosList.map((m) => (
                    <option key={m.municipio} value={m.municipio}>
                      {m.municipio}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="arrow_drop_down" />
                </span>
              </div>
              {errors.municipio && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {errors.municipio.message}
                </p>
              )}
            </div>

            {/* Parroquia */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Parroquia <span className="text-error font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="explore" size="20px" />
                </span>
                <select
                  className={`
                    w-full bg-surface-container-low border rounded-lg
                    pl-10 pr-10 py-3 text-body-md text-on-surface
                    font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all duration-200 appearance-none cursor-pointer
                    ${errors.parroquia ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                  `}
                  required
                  disabled={!watchMunicipio}
                  {...register('parroquia')}
                >
                  <option value="">Seleccione una parroquia...</option>
                  {parroquiasList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="arrow_drop_down" />
                </span>
              </div>
              {errors.parroquia && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {errors.parroquia.message}
                </p>
              )}
            </div>

            {/* Ciudad/Pueblo */}
            <Input
              label="Ciudad / Pueblo"
              icon="location_city"
              placeholder="Ej. Coro"
              error={errors.ciudadPueblo?.message}
              required
              {...register('ciudadPueblo')}
            />

            {/* Circuito/Comuna */}
            <Input
              label="Circuito / Comuna (Opcional)"
              icon="schema"
              placeholder="Ej. Comuna Guerreros de la Patria"
              error={errors.circuitoComuna?.message}
              {...register('circuitoComuna')}
            />
          </div>

          <div className="h-px bg-outline-variant/20 my-lg" />

          {/* Form Actions */}
          <div className="flex justify-end gap-md">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => navigate('/comunidades')}
              className="active:scale-95 transition-all"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              icon={<Icon name="save" size="20px" />}
              className="active:scale-95 transition-all px-lg"
            >
              {isEditMode ? 'Guardar Cambios' : 'Registrar Comunidad'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
