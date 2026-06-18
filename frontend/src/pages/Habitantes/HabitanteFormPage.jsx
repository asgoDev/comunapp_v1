import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { useHabitanteStore } from '../../stores/habitanteStore';
import { useComunidadStore } from '../../stores/comunidadStore';
import { createHabitanteSchema, updateHabitanteSchema } from '../../validations/habitante.js';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

const CALLES_FIJAS = ['Principal', 'Calle 1', 'Calle 2', 'Calle 3', 'Calle 4'];

export default function HabitanteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentUser = useAuthStore((s) => s.user);
  const { createHabitante, updateHabitante, fetchHabitanteById, isLoading } = useHabitanteStore();
  const { comunidades, fetchComunidades } = useComunidadStore();

  const isEditMode = !!id;
  const isAdmin = currentUser?.role === 'admin';
  const isLiderCalle = currentUser?.role === 'LIDER_CALLE';

  // Obtener parámetros iniciales para prellenar
  const queryCasa = searchParams.get('casa') || '';
  const queryCalle = searchParams.get('calle') || '';

  const [cedulaTipo, setCedulaTipo] = useState('V');
  const [cedulaNum, setCedulaNum] = useState('');
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(isEditMode ? updateHabitanteSchema : createHabitanteSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      cedula: '',
      fechaNacimiento: '',
      numeroCasa: queryCasa || '',
      jefeFamilia: false,
      discapacitado: '',
      comunidad: '',
      calle: queryCalle || '',
    },
  });

  // Redirigir si no tiene permisos
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'LIDER_CALLE')) {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/habitantes" replace />;
  }

  // Cargar comunidades si es admin
  useEffect(() => {
    if (isAdmin) {
      fetchComunidades(1, { limit: 200 }).catch(() => {
        toast.error('No se pudo cargar la lista de comunidades.');
      });
    }
  }, [fetchComunidades, isAdmin]);

  // Sincronizar cédula
  useEffect(() => {
    const cleanNum = cedulaNum.trim();
    if (cleanNum) {
      setValue('cedula', `${cedulaTipo}-${cleanNum}`, { shouldValidate: true });
    } else {
      setValue('cedula', '', { shouldValidate: true });
    }
  }, [cedulaTipo, cedulaNum, setValue]);

  // Cargar habitante en modo edición
  useEffect(() => {
    if (isEditMode) {
      fetchHabitanteById(id)
        .then((h) => {
          reset({
            nombres: h.nombres || '',
            apellidos: h.apellidos || '',
            fechaNacimiento: h.fechaNacimiento
              ? new Date(h.fechaNacimiento).toISOString().split('T')[0]
              : '',
            numeroCasa: h.numeroCasa || '',
            jefeFamilia: h.jefeFamilia || false,
            discapacitado: h.discapacitado || '',
            comunidad: h.comunidad?._id || h.comunidad || '',
            calle: h.calle || '',
          });
          setTieneDiscapacidad(!!h.discapacitado);

          if (h.cedula) {
            const parts = h.cedula.split('-');
            if (parts.length === 2) {
              setCedulaTipo(parts[0]);
              setCedulaNum(parts[1]);
            } else {
              setCedulaNum(h.cedula);
            }
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error al cargar la información del habitante.');
          navigate('/habitantes');
        });
    }
  }, [id, isEditMode, fetchHabitanteById, navigate, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };

      // Si es Líder de Calle, comunidad y calle las inyecta el backend,
      // pero para estar seguros los removemos o dejamos que el backend use los suyos.
      if (isLiderCalle) {
        delete payload.comunidad;
        delete payload.calle;
      }

      // Limpiar campos vacíos
      if (!payload.cedula) delete payload.cedula;
      if (!payload.discapacitado) delete payload.discapacitado;

      if (isEditMode) {
        // En edición, no permitimos cambiar casa, calle ni comunidad
        delete payload.numeroCasa;
        delete payload.comunidad;
        delete payload.calle;

        await updateHabitante(id, payload);
        toast.success('Habitante actualizado exitosamente.');
      } else {
        await createHabitante(payload);
        toast.success('Habitante registrado exitosamente.');
      }

      // Volver a la vista de la casa o al listado general
      const targetCalle = isLiderCalle ? currentUser.calle : (data.calle || queryCalle);
      const targetCasa = data.numeroCasa || queryCasa;
      if (targetCalle && targetCasa) {
        navigate(`/habitantes/casa/${targetCasa}?calle=${encodeURIComponent(targetCalle)}`);
      } else {
        navigate('/habitantes');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Error al procesar la solicitud.';
      toast.error(serverMessage);

      if (serverMessage.toLowerCase().includes('cédula') || serverMessage.toLowerCase().includes('cedula')) {
        setError('cedula', { message: 'Cédula ya registrada en esta comunidad.' });
      }
    }
  };

  const getPageTitle = () => {
    if (isEditMode) return 'Actualizar Habitante';
    return 'Registro de Habitante';
  };

  return (
    <div className="space-y-lg animate-fade-in-up max-w-4xl mx-auto">
      {/* Volver */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>Volver</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-white/10 rounded-xl">
              <Icon name={isEditMode ? 'edit_note' : 'person_add'} size="28px" />
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md font-bold">{getPageTitle()}</h2>
              <p className="text-body-sm text-white/80 mt-0.5">
                {isEditMode ? 'Edite la información personal del habitante.' : 'Complete los datos del nuevo miembro de la comunidad.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-lg space-y-md">
          {/* Información de Vivienda */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
            Ubicación y Vivienda
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {/* Comunidad */}
            {isAdmin ? (
              <div className="space-y-1">
                <label className="block text-label-lg font-label-lg text-on-surface-variant">
                  Comunidad <span className="text-error font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="home_work" size="20px" />
                  </span>
                  <select
                    disabled={isEditMode}
                    className={`
                      w-full bg-surface-container-low border rounded-lg
                      pl-10 pr-10 py-3 text-body-md text-on-surface
                      font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50
                      ${errors.comunidad ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                    `}
                    {...register('comunidad')}
                  >
                    <option value="">Seleccione una comunidad...</option>
                    {comunidades.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                </div>
                {errors.comunidad && (
                  <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                    <Icon name="error" size="14px" />
                    {errors.comunidad.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-label-sm font-semibold text-on-surface-variant">Comunidad</label>
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-body-md text-on-surface font-medium">
                  {currentUser?.comunidad?.nombre || 'Mi Comunidad'}
                </div>
              </div>
            )}

            {/* Calle */}
            {isAdmin ? (
              <div className="space-y-1">
                <label className="block text-label-lg font-label-lg text-on-surface-variant">
                  Calle <span className="text-error font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="signpost" size="20px" />
                  </span>
                  <select
                    disabled={isEditMode}
                    className={`
                      w-full bg-surface-container-low border rounded-lg
                      pl-10 pr-10 py-3 text-body-md text-on-surface
                      font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50
                      ${errors.calle ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                    `}
                    {...register('calle')}
                  >
                    <option value="">Seleccione una calle...</option>
                    {CALLES_FIJAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                </div>
                {errors.calle && (
                  <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                    <Icon name="error" size="14px" />
                    {errors.calle.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-label-sm font-semibold text-on-surface-variant">Calle</label>
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-body-md text-on-surface font-medium">
                  {currentUser?.calle || 'Mi Calle'}
                </div>
              </div>
            )}

            {/* Número de Casa */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Número de Casa {!isEditMode && <span className="text-error font-bold">*</span>}
              </label>
              <Input
                disabled={isEditMode}
                icon="home"
                placeholder="Ej. 14A o 12"
                error={errors.numeroCasa?.message}
                {...register('numeroCasa')}
              />
            </div>
          </div>

          {/* Datos Personales */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pt-sm pb-xs border-b border-outline-variant/20">
            Datos Personales
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <Input
              label="Nombres"
              icon="person"
              placeholder="Ej. Juan Carlos"
              error={errors.nombres?.message}
              required
              {...register('nombres')}
            />

            <Input
              label="Apellidos"
              icon="person"
              placeholder="Ej. Pérez Gómez"
              error={errors.apellidos?.message}
              required
              {...register('apellidos')}
            />

            {/* Cédula */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Cédula <span className="text-xs text-on-surface-variant/60 font-normal">(opcional)</span>
              </label>
              <div className="flex gap-xs">
                <div className="relative flex-shrink-0">
                  <select
                    value={cedulaTipo}
                    onChange={(e) => setCedulaTipo(e.target.value)}
                    className="h-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-8 text-body-md text-on-surface font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                </div>

                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                    <Icon name="badge" size="20px" />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Dejar en blanco si no posee"
                    value={cedulaNum}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCedulaNum(val);
                    }}
                    className={`
                      w-full bg-surface-container-low border rounded-lg
                      pl-10 pr-4 py-3 text-body-md text-on-surface
                      placeholder:text-outline font-montserrat
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      transition-all duration-200
                      ${errors.cedula ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                    `}
                  />
                </div>
              </div>
              {errors.cedula && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {errors.cedula.message}
                </p>
              )}
            </div>

            <Input
              label="Fecha de Nacimiento"
              type="date"
              icon="calendar_today"
              error={errors.fechaNacimiento?.message}
              required
              {...register('fechaNacimiento')}
            />
          </div>

          {/* Información Adicional */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pt-sm pb-xs border-b border-outline-variant/20">
            Información Familiar y de Salud
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Jefe de Familia */}
            <div className="flex items-center gap-md p-md bg-surface-container-low border border-outline-variant/30 rounded-lg">
              <input
                id="jefeFamilia"
                type="checkbox"
                className="w-5 h-5 accent-primary cursor-pointer"
                {...register('jefeFamilia')}
              />
              <label htmlFor="jefeFamilia" className="cursor-pointer select-none">
                <span className="block font-bold text-body-md text-on-surface">¿Es Jefe de Familia?</span>
                <span className="block text-xs text-on-surface-variant mt-0.5">
                  Indica si el habitante es el representante principal de la vivienda.
                </span>
              </label>
            </div>

            {/* Discapacidad */}
            <div className="space-y-md p-md bg-surface-container-low border border-outline-variant/30 rounded-lg flex flex-col justify-between">
              <div className="flex items-center gap-md">
                <input
                  id="checkDiscapacidad"
                  type="checkbox"
                  className="w-5 h-5 accent-primary cursor-pointer"
                  checked={tieneDiscapacidad}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTieneDiscapacidad(checked);
                    if (!checked) {
                      setValue('discapacitado', '');
                    }
                  }}
                />
                <label htmlFor="checkDiscapacidad" className="cursor-pointer select-none">
                  <span className="block font-bold text-body-md text-on-surface">¿Posee alguna discapacidad?</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">
                    Marque esta casilla si la persona tiene alguna discapacidad.
                  </span>
                </label>
              </div>
              <Input
                label="Especifique la discapacidad"
                icon="accessible"
                placeholder={tieneDiscapacidad ? "Ej. Motora, Visual, Auditiva..." : "Marque la casilla para habilitar"}
                disabled={!tieneDiscapacidad}
                error={errors.discapacitado?.message}
                {...register('discapacitado')}
              />
            </div>
          </div>

          <div className="h-px bg-outline-variant/20 my-lg" />

          {/* Acciones */}
          <div className="flex justify-end gap-md">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => navigate(-1)}
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
              {isEditMode ? 'Guardar Cambios' : 'Registrar Habitante'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
