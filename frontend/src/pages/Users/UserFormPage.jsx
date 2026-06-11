import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { createUserSchema, updateUserSchema } from '../../validations/user.js';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { createUser, updateUser, fetchUserById, isLoading } = useUserStore();

  const isEditMode = !!id;
  const isReadOnly = false;

  const [cedulaTipo, setCedulaTipo] = useState('V');
  const [cedulaNum, setCedulaNum] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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
      role: 'user',
      telefono: '',
      direccion: '',
      cargo: 'Usuario',
      fechaNacimiento: '',
    },
  });

  if (!currentUser || currentUser.role !== 'admin') {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  // Sincronizar la cédula de los estados locales al campo de react-hook-form
  useEffect(() => {
    const cleanNum = cedulaNum.trim();
    if (cleanNum) {
      setValue('cedula', `${cedulaTipo}-${cleanNum}`, { shouldValidate: true });
    } else {
      setValue('cedula', '');
    }
  }, [cedulaTipo, cedulaNum, setValue]);

  // Cargar información del usuario en modo edición/lectura
  useEffect(() => {
    if (isEditMode) {
      fetchUserById(id)
        .then((userData) => {
          reset({
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            email: userData.email || '',
            password: '', // Vacío por seguridad
            role: userData.role || '',
            telefono: userData.telefono || '',
            direccion: userData.direccion || '',
            cargo: userData.cargo || '',
            fechaNacimiento: userData.fechaNacimiento
              ? new Date(userData.fechaNacimiento).toISOString().split('T')[0]
              : '',
            cedula: userData.cedula || '',
          });

          // Desglosar cédula en estados locales
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
  }, [id, isEditMode, fetchUserById, navigate, reset]);

  const onSubmit = async (data) => {
    if (isReadOnly) return;

    try {
      const userData = { ...data };

      // Remover password si está vacío en edición
      if (isEditMode && !userData.password) {
        delete userData.password;
      }

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

  // Títulos dinámicos según el modo
  const getPageTitle = () => {
    if (isReadOnly) return 'Detalles del Usuario';
    if (isEditMode) return 'Actualizar Información del Usuario';
    return 'Registro de Nuevo Usuario';
  };

  const getPageSubtitle = () => {
    if (isReadOnly) return 'Visualización detallada de la información de usuario.';
    if (isEditMode) return 'Modifique los campos necesarios para actualizar la cuenta.';
    return 'Complete todos los campos para crear una cuenta con privilegios en la plataforma.';
  };

  const getPageIcon = () => {
    if (isReadOnly) return 'visibility';
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
          <span>Volver a Usuarios</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

            {/* Nombre */}
            <Input
              label="Nombre"
              icon="person"
              placeholder="Ej. Juan"
              error={errors.nombre?.message}
              disabled={isReadOnly}
              required={!isReadOnly}
              {...register('nombre')}
            />

            {/* Apellido */}
            <Input
              label="Apellido"
              icon="person"
              placeholder="Ej. Pérez"
              error={errors.apellido?.message}
              disabled={isReadOnly}
              required={!isReadOnly}
              {...register('apellido')}
            />

            {/* Cédula Combinada */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Cédula {!isReadOnly && <span className="text-error font-bold">*</span>}
              </label>
              <div className="flex gap-xs">
                {/* Selector V / E */}
                <div className="relative flex-shrink-0">
                  <select
                    value={cedulaTipo}
                    onChange={(e) => !isReadOnly && setCedulaTipo(e.target.value)}
                    disabled={isReadOnly}
                    className="h-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-8 text-body-md text-on-surface font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  {!isReadOnly && (
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
                    disabled={isReadOnly}
                    onChange={(e) => {
                      if (isReadOnly) return;
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

            {/* Correo Electrónico */}
            <Input
              label="Correo Electrónico"
              type="email"
              icon="mail"
              placeholder="ejemplo@sigas.gob.ve"
              error={errors.email?.message}
              disabled={isReadOnly}
              required={!isReadOnly}
              {...register('email')}
            />

            {/* Contraseña */}
            {!isReadOnly && (
              <Input
                label={isEditMode ? "Nueva Contraseña" : "Contraseña"}
                type="password"
                icon="lock"
                placeholder={isEditMode ? "Dejar en blanco para no modificar" : "Mínimo 6 caracteres"}
                error={errors.password?.message}
                required={!isEditMode}
                {...register('password')}
              />
            )}

            {/* Rol de Usuario */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                Rol del Usuario {!isReadOnly && <span className="text-error font-bold">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="admin_panel_settings" size="20px" />
                </span>
                <select
                  disabled={isReadOnly}
                  className={`
                    w-full bg-surface-container-low border rounded-lg
                    pl-10 pr-10 py-3 text-body-md text-on-surface
                    font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${errors.role ? 'border-error focus:ring-error/30 focus:border-error' : 'border-outline-variant/40 hover:border-outline'}
                  `}
                  required={!isReadOnly}
                  {...register('role')}
                >
                  <option value="" disabled>Seleccione un rol...</option>
                  <option value="admin">Administrador</option>
                  <option value="user">Usuario</option>
                </select>
                {!isReadOnly && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    <Icon name="arrow_drop_down" />
                  </span>
                )}
              </div>
              {errors.role && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <Input
              label="Teléfono"
              type="tel"
              icon="phone"
              placeholder="Ej. 04121234567"
              error={errors.telefono?.message}
              disabled={isReadOnly}
              {...register('telefono')}
            />

            {/* Fecha de Nacimiento */}
            <Input
              label="Fecha de Nacimiento"
              type="date"
              icon="calendar_today"
              error={errors.fechaNacimiento?.message}
              disabled={isReadOnly}
              {...register('fechaNacimiento')}
            />

            {/* Cargo */}
            <Input
              label="Cargo / Puesto de Trabajo"
              icon="work"
              placeholder="Ej. Coord. de Sistemas"
              error={errors.cargo?.message}
              disabled={isReadOnly}
              {...register('cargo')}
            />

            {/* Dirección */}
            <Input
              label="Dirección de Habitación"
              icon="home"
              placeholder="Ej. Av. Principal de Coro, Casa Nro. 5"
              error={errors.direccion?.message}
              disabled={isReadOnly}
              className="md:col-span-2"
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
              {isReadOnly ? 'Volver' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button
                type="submit"
                loading={isLoading}
                icon={<Icon name="save" size="20px" />}
                className="active:scale-95 transition-all px-lg"
              >
                {isEditMode ? 'Guardar Cambios' : 'Registrar Usuario'}
              </Button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
