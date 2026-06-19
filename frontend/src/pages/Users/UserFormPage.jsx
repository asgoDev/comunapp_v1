import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { useComunidadStore } from '../../stores/comunidadStore';
import { createUserSchema, updateUserSchema } from '../../validations/user.js';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

// Roles que requieren comunidad asignada
const ROLES_CON_COMUNIDAD = ['JEFE_COMUNIDAD', 'LIDER_CALLE'];
// Roles que requieren calle asignada (además de comunidad)
const ROLES_CON_CALLE = ['LIDER_CALLE'];

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { createUser, updateUser, fetchUserById, isLoading } = useUserStore();
  const { comunidades, fetchComunidades } = useComunidadStore();

  const isEditMode = !!id;

  const [cedulaTipo, setCedulaTipo] = useState('V');
  const [cedulaNum, setCedulaNum] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(isEditMode ? updateUserSchema : createUserSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      cedula: '',
      email: '',
      password: '',
      role: '',
      telefono: '',
      direccion: '',
      fechaNacimiento: '',
      comunidad: '',
      calle: '',
    },
  });

  // Observar el rol seleccionado para mostrar campos condicionales
  const selectedRole = watch('role');
  const showComunidad = ROLES_CON_COMUNIDAD.includes(selectedRole);
  const showCalle = ROLES_CON_CALLE.includes(selectedRole);

  const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'JEFE_COMUNIDAD');
  const isJefeComunidad = currentUser?.role === 'JEFE_COMUNIDAD';

  if (!currentUser || !isAuthorized) {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  // Set default role and community for Jefe de Comunidad on mount
  useEffect(() => {
    if (!isEditMode && isJefeComunidad) {
      setValue('role', 'LIDER_CALLE');
      setValue('comunidad', currentUser.comunidad?._id || currentUser.comunidad || '');
    }
  }, [isJefeComunidad, isEditMode, currentUser, setValue]);

  // Cargar lista de comunidades activas al montar
  useEffect(() => {
    fetchComunidades(1, { limit: 200 }).catch(() => {
      toast.error('No se pudo cargar la lista de comunidades.');
    });
  }, [fetchComunidades]);

  // Sincronizar la cédula de los estados locales al campo de react-hook-form
  useEffect(() => {
    if (isEditMode) return; // En edición la cédula está deshabilitada
    const cleanNum = cedulaNum.trim();
    if (cleanNum) {
      setValue('cedula', `${cedulaTipo}-${cleanNum}`, { shouldValidate: true });
    } else {
      setValue('cedula', '');
    }
  }, [cedulaTipo, cedulaNum, setValue, isEditMode]);

  // Limpiar campos territoriales cuando el rol cambia y ya no los requiere
  useEffect(() => {
    if (!showComunidad) {
      setValue('comunidad', '', { shouldValidate: false });
      setValue('calle', '', { shouldValidate: false });
    } else if (!showCalle) {
      setValue('calle', '', { shouldValidate: false });
    }
  }, [selectedRole, showComunidad, showCalle, setValue]);

  // Cargar información del usuario en modo edición
  useEffect(() => {
    if (isEditMode) {
      fetchUserById(id)
        .then((userData) => {
          if (isJefeComunidad) {
            const jefeComId = currentUser.comunidad?._id || currentUser.comunidad;
            const userComId = userData.comunidad?._id || userData.comunidad;
            if (userData.role !== 'LIDER_CALLE' || userComId?.toString() !== jefeComId?.toString()) {
              toast.error('No tiene permisos para editar este usuario.');
              navigate('/usuarios');
              return;
            }
          }
          reset({
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            email: userData.email || '',
            password: '',
            role: userData.role || '',
            telefono: userData.telefono || '',
            direccion: userData.direccion || '',
            fechaNacimiento: userData.fechaNacimiento
              ? new Date(userData.fechaNacimiento).toISOString().split('T')[0]
              : '',
            // La cédula NO se incluye en el reset porque no es editable
            comunidad: userData.comunidad?._id || userData.comunidad || '',
            calle: userData.calle || '',
          });

          // Rellenar los estados de la cédula solo para mostrarla (disabled)
          if (userData.cedula) {
            const parts = userData.cedula.split('-');
            if (parts.length === 2) {
              setCedulaTipo(parts[0]);
              setCedulaNum(parts[1]);
            } else {
              setCedulaNum(userData.cedula);
            }
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error al cargar la información del usuario.');
          navigate('/usuarios');
        });
    }
  }, [id, isEditMode, fetchUserById, navigate, reset, isJefeComunidad, currentUser]);

  const handleTelefonoChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 4) {
      val = `${val.slice(0, 4)}-${val.slice(4)}`;
    }
    e.target.value = val;
  };

  const onSubmit = async (data) => {
    try {
      const userData = { ...data };

      // Remover password si está vacío en edición
      if (isEditMode && !userData.password) {
        delete userData.password;
      }

      // Limpiar campos territoriales si el rol no los requiere
      if (!ROLES_CON_COMUNIDAD.includes(userData.role)) {
        delete userData.comunidad;
        delete userData.calle;
      } else if (!ROLES_CON_CALLE.includes(userData.role)) {
        delete userData.calle;
      }

      // Limpiar strings vacíos opcionales
      if (!userData.comunidad) delete userData.comunidad;
      if (!userData.calle) delete userData.calle;
      if (!userData.telefono) delete userData.telefono;
      if (!userData.direccion) delete userData.direccion;

      if (isEditMode) {
        await updateUser(id, userData);
        toast.success('Usuario actualizado exitosamente.');
      } else {
        await createUser(userData);
        toast.success('Usuario registrado exitosamente.');
      }
      navigate('/usuarios');
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Error al registrar el usuario';
      toast.error(serverMessage);

      if (serverMessage.toLowerCase().includes('cédula') || serverMessage.toLowerCase().includes('cedula')) {
        setError('cedula', { message: 'Cédula ya registrada en el sistema' });
      } else if (serverMessage.toLowerCase().includes('email') || serverMessage.toLowerCase().includes('correo')) {
        setError('email', { message: 'Correo electrónico ya registrado en el sistema' });
      }
    }
  };

  const getPageTitle = () => {
    if (isEditMode) {
      return isJefeComunidad ? 'Actualizar Información del Líder de Calle' : 'Actualizar Información del Usuario';
    }
    return isJefeComunidad ? 'Registro de Nuevo Líder de Calle' : 'Registro de Nuevo Usuario';
  };

  const getPageSubtitle = () => {
    if (isEditMode) return 'Modifique los campos necesarios para actualizar la cuenta.';
    return isJefeComunidad
      ? 'Complete todos los campos para crear un líder de calle en su comunidad.'
      : 'Complete todos los campos para crear una cuenta con privilegios en la plataforma.';
  };

  const getPageIcon = () => {
    if (isEditMode) return 'manage_accounts';
    return 'person_add';
  };

  return (
    <div className="space-y-lg animate-fade-in-up max-w-4xl mx-auto">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          onClick={() => navigate('/usuarios')}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>{isJefeComunidad ? 'Volver a Líderes de Calle' : 'Volver a Usuarios'}</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-white/10 rounded-xl">
              <Icon name={getPageIcon()} size="28px" />
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md font-bold">{getPageTitle()}</h2>
              <p className="text-body-sm text-white/80 mt-0.5">{getPageSubtitle()}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-lg space-y-md">

          {/* ── Sección: Identidad ─────────────────────────────────────── */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
            Datos Personales
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

            {/* Nombre */}
            <Input
              label="Nombre"
              icon="person"
              placeholder="Ej. Juan"
              error={errors.nombre?.message}
              required
              {...register('nombre')}
            />

            {/* Apellido */}
            <Input
              label="Apellido"
              icon="person"
              placeholder="Ej. Pérez"
              error={errors.apellido?.message}
              required
              {...register('apellido')}
            />

            {/* Cédula Combinada */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Cédula {!isEditMode && <span className="text-error font-bold">*</span>}
                {isEditMode && (
                  <span className="ml-2 text-xs text-on-surface-variant/60 font-normal">(no editable)</span>
                )}
              </label>
              <div className="flex gap-xs">
                {/* Selector V / E */}
                <div className="relative flex-shrink-0">
                  <select
                    value={cedulaTipo}
                    onChange={(e) => !isEditMode && setCedulaTipo(e.target.value)}
                    disabled={isEditMode}
                    className="h-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-8 text-body-md text-on-surface font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  {!isEditMode && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      <Icon name="arrow_drop_down" />
                    </span>
                  )}
                </div>

                {/* Input numérico */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                    <Icon name="badge" size="20px" />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="12345678"
                    value={cedulaNum}
                    disabled={isEditMode}
                    onChange={(e) => {
                      if (isEditMode) return;
                      const val = e.target.value.replace(/\D/g, '');
                      setCedulaNum(val);
                    }}
                    className={`
                      w-full bg-surface-container-low border rounded-lg
                      pl-10 pr-4 py-3 text-body-md text-on-surface
                      placeholder:text-outline font-montserrat
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
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

            {/* Fecha de Nacimiento */}
            <Input
              label="Fecha de Nacimiento"
              type="date"
              icon="calendar_today"
              error={errors.fechaNacimiento?.message}
              required={!isEditMode}
              {...register('fechaNacimiento')}
            />
          </div>

          {/* ── Sección: Acceso ───────────────────────────────────────── */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pt-sm pb-xs border-b border-outline-variant/20">
            Acceso y Permisos
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

            {/* Correo Electrónico */}
            <Input
              label="Correo Electrónico"
              type="email"
              icon="mail"
              placeholder="ejemplo@correo.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            {/* Contraseña */}
            <Input
              label={isEditMode ? 'Nueva Contraseña' : 'Contraseña'}
              type="password"
              icon="lock"
              placeholder={isEditMode ? 'Dejar en blanco para no modificar' : 'Mínimo 8 caracteres'}
              error={errors.password?.message}
              required={!isEditMode}
              {...register('password')}
            />

            {/* Rol de Usuario */}
            {!isJefeComunidad ? (
              <div className="space-y-1">
                <label className="block text-label-lg font-label-lg text-on-surface-variant">
                  Rol del Usuario <span className="text-error font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="admin_panel_settings" size="20px" />
                  </span>
                  <select
                    className={`
                      w-full bg-surface-container-low border rounded-lg
                      pl-10 pr-10 py-3 text-body-md text-on-surface
                      font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      transition-all duration-200 appearance-none cursor-pointer
                      ${errors.role ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                    `}
                    required
                    {...register('role')}
                  >
                    <option value="" disabled>Seleccione un rol...</option>
                    <option value="admin">Administrador</option>
                    <option value="JEFE_COMUNIDAD">Jefe de Comunidad</option>
                    <option value="LIDER_CALLE">Líder de Calle</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                </div>
                {errors.role && (
                  <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                    <Icon name="error" size="14px" />
                    {errors.role.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-label-lg font-label-lg text-on-surface-variant">
                  Rol del Usuario
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="admin_panel_settings" size="20px" />
                  </span>
                  <input
                    type="text"
                    value="Líder de Calle"
                    disabled
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-3 text-body-md text-on-surface font-montserrat disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Estado (solo en edición) */}
            {isEditMode && (
              <div className="space-y-1">
                <label className="block text-label-lg font-label-lg text-on-surface-variant">
                  Estado de la Cuenta
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="toggle_on" size="20px" />
                  </span>
                  <select
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-10 py-3 text-body-md text-on-surface font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                    {...register('estado')}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Sección: Asignación Territorial (condicional) ─────────── */}
          {showComunidad && (
            <>
              <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pt-sm pb-xs border-b border-outline-variant/20">
                Asignación Territorial
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

                {/* Selector de Comunidad */}
                {!isJefeComunidad ? (
                  <div className="space-y-1">
                    <label className="block text-label-lg font-label-lg text-on-surface-variant">
                      Comunidad <span className="text-error font-bold">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        <Icon name="home_work" size="20px" />
                      </span>
                      <select
                        className={`
                          w-full bg-surface-container-low border rounded-lg
                          pl-10 pr-10 py-3 text-body-md text-on-surface
                          font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                          transition-all duration-200 appearance-none cursor-pointer
                          ${errors.comunidad ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                        `}
                        {...register('comunidad')}
                      >
                        <option value="">Seleccione una comunidad...</option>
                        {comunidades.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.nombre} — {c.municipio}, {c.estado}
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
                    <label className="block text-label-lg font-label-lg text-on-surface-variant">
                      Comunidad
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        <Icon name="home_work" size="20px" />
                      </span>
                      <input
                        type="text"
                        value={currentUser.comunidad?.nombre || ''}
                        disabled
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-3 text-body-md text-on-surface font-montserrat disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* Input de Calle (solo LIDER_CALLE) */}
                {showCalle && (
                  <Input
                    label="Calle Asignada"
                    icon="signpost"
                    placeholder="Ej. Calle Principal Norte"
                    error={errors.calle?.message}
                    required
                    {...register('calle')}
                  />
                )}
              </div>
            </>
          )}

          {/* ── Sección: Contacto ──────────────────────────────────────── */}
          <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pt-sm pb-xs border-b border-outline-variant/20">
            Información de Contacto
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

            {/* Teléfono */}
            <Input
              label="Teléfono"
              type="tel"
              icon="phone"
              placeholder="Ej. 0412-1234567"
              error={errors.telefono?.message}
              {...register('telefono', { onChange: handleTelefonoChange })}
            />

            {/* Dirección */}
            <Input
              label="Dirección de Habitación"
              icon="home"
              placeholder="Ej. Av. Principal de Coro, Casa Nro. 5"
              error={errors.direccion?.message}
              {...register('direccion')}
            />

          </div>

          <div className="h-px bg-outline-variant/20 my-lg" />

          {/* Form Actions */}
          <div className="flex justify-end gap-md">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => navigate('/usuarios')}
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
              {isEditMode ? 'Guardar Cambios' : (isJefeComunidad ? 'Registrar Líder de Calle' : 'Registrar Usuario')}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
