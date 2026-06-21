import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfile, useUpdateProfile, useChangePassword } from '../../hooks/useProfileQueries';
import { updateProfileSchema, changePasswordSchema } from '../../validations/profile';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { data: profileData, isLoading, isError } = useProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangePassword();

  // Formulario de datos personales
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      fechaNacimiento: '',
    },
  });

  // Formulario de cambio de contraseña
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Sincronizar datos del perfil con el formulario una vez cargados
  useEffect(() => {
    if (profileData) {
      resetProfile({
        nombre: profileData.nombre || '',
        apellido: profileData.apellido || '',
        email: profileData.email || '',
        telefono: profileData.telefono || '',
        direccion: profileData.direccion || '',
        fechaNacimiento: profileData.fechaNacimiento
          ? new Date(profileData.fechaNacimiento).toISOString().split('T')[0]
          : '',
      });
    }
  }, [profileData, resetProfile]);

  const onUpdateProfileSubmit = async (data) => {
    try {
      await updateProfile(data);
      toast.success('Perfil actualizado exitosamente.');
    } catch (error) {
      const serverMessage = error.response?.data?.message || 'Error al actualizar el perfil.';
      toast.error(serverMessage);
    }
  };

  const onChangePasswordSubmit = async (data) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Contraseña cambiada exitosamente.');
      resetPassword();
    } catch (error) {
      const serverMessage = error.response?.data?.message || 'Error al cambiar la contraseña.';
      toast.error(serverMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-md">
        <span className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-body-md text-on-surface-variant font-medium">Cargando perfil...</p>
      </div>
    );
  }

  if (isError || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto space-y-md">
        <div className="p-md bg-error/10 text-error rounded-full">
          <Icon name="error" size="48px" />
        </div>
        <h2 className="text-headline-md font-bold text-on-surface">Error al cargar perfil</h2>
        <p className="text-body-md text-on-surface-variant">
          No pudimos obtener la información de tu perfil. Por favor, intenta de nuevo más tarde o contacta al administrador.
        </p>
      </div>
    );
  }

  // Nombre formateado para el Avatar y título
  const fullName = `${profileData.nombre} ${profileData.apellido}`;
  const displayRole = profileData.role === 'admin' 
    ? 'Administrador' 
    : profileData.role === 'JEFE_COMUNIDAD' 
      ? 'Jefe de Comunidad' 
      : 'Líder de Calle';

  return (
    <div className="space-y-lg animate-fade-in-up max-w-6xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Mi Perfil</h1>
        <p className="text-body-md text-on-surface-variant">
          Gestiona tus datos personales y la seguridad de tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        {/* Columna Izquierda: Tarjeta del perfil e Información de cuenta */}
        <div className="space-y-lg lg:col-span-1">
          {/* Card del perfil */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden text-center p-lg space-y-md">
            <div className="flex justify-center pt-md">
              <Avatar
                name={fullName}
                size="lg"
                className="w-24 h-24 text-headline-lg border-4 border-primary/20 shadow-md"
              />
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface capitalize">{fullName}</h2>
              <p className="text-body-md text-primary font-semibold">{displayRole}</p>
              <p className="text-body-sm text-on-surface-variant/80 mt-1">{profileData.email}</p>
            </div>
            
            <div className="pt-sm border-t border-outline-variant/20 flex flex-col gap-xs text-left">
              {profileData.comunidad && (
                <div className="flex items-center gap-sm text-body-sm text-on-surface-variant">
                  <Icon name="home_work" size="18px" className="text-primary/70" />
                  <div>
                    <span className="font-semibold block">Comunidad</span>
                    <span className="capitalize">{profileData.comunidad?.nombre || profileData.comunidad}</span>
                  </div>
                </div>
              )}
              {profileData.calle && (
                <div className="flex items-center gap-sm text-body-sm text-on-surface-variant mt-sm">
                  <Icon name="nature_people" size="18px" className="text-primary/70" />
                  <div>
                    <span className="font-semibold block">Calle</span>
                    <span className="capitalize">{profileData.calle}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card de Información de cuenta (Administrativa / Solo Lectura) */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-lg space-y-md">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
              <Icon name="info" size="20px" className="text-primary" />
              Información de Cuenta
            </h3>
            <div className="space-y-sm text-body-sm pt-xs">
              <div className="flex justify-between py-xs border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Cédula:</span>
                <span className="font-semibold text-on-surface">{profileData.cedula}</span>
              </div>
              <div className="flex justify-between py-xs border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Rol administrativo:</span>
                <span className="font-semibold text-on-surface capitalize">{profileData.role.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-xs border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Estado:</span>
                <span className="inline-flex items-center gap-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${profileData.estado === 'activo' ? 'bg-success' : 'bg-outline'}`} />
                  <span className="font-semibold text-on-surface capitalize">{profileData.estado}</span>
                </span>
              </div>
              <div className="flex justify-between py-xs">
                <span className="text-on-surface-variant">Miembro desde:</span>
                <span className="font-semibold text-on-surface">
                  {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('es-VE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'No disponible'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formularios de Edición y Cambio de Contraseña */}
        <div className="space-y-lg lg:col-span-2">
          {/* Card de Datos Personales */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white flex items-center gap-md">
              <div className="p-xs bg-white/10 rounded-lg">
                <Icon name="person" size="24px" />
              </div>
              <div>
                <h2 className="text-title-lg font-bold">Datos Personales</h2>
                <p className="text-body-xs text-white/80 mt-0.5">Mantén tu información personal al día.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitProfile(onUpdateProfileSubmit)} className="p-lg space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* Nombre */}
                <Input
                  label="Nombre"
                  icon="person"
                  placeholder="Tu nombre"
                  error={profileErrors.nombre?.message}
                  {...registerProfile('nombre')}
                />

                {/* Apellido */}
                <Input
                  label="Apellido"
                  icon="person"
                  placeholder="Tu apellido"
                  error={profileErrors.apellido?.message}
                  {...registerProfile('apellido')}
                />

                {/* Correo Electrónico */}
                <Input
                  label="Correo Electrónico"
                  type="email"
                  icon="mail"
                  placeholder="correo@ejemplo.com"
                  error={profileErrors.email?.message}
                  {...registerProfile('email')}
                />

                {/* Teléfono */}
                <Input
                  label="Teléfono"
                  icon="call"
                  placeholder="Ej. 0412-1234567"
                  error={profileErrors.telefono?.message}
                  {...registerProfile('telefono')}
                />

                {/* Fecha de Nacimiento */}
                <Input
                  label="Fecha de Nacimiento"
                  type="date"
                  icon="calendar_today"
                  error={profileErrors.fechaNacimiento?.message}
                  {...registerProfile('fechaNacimiento')}
                />

                {/* Dirección */}
                <div className="md:col-span-2">
                  <Input
                    label="Dirección de Habitación"
                    icon="location_on"
                    placeholder="Calle, número de casa, punto de referencia..."
                    error={profileErrors.direccion?.message}
                    {...registerProfile('direccion')}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-sm border-t border-outline-variant/10">
                <Button type="submit" loading={isUpdating} icon={<Icon name="save" size="20px" />}>
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>

          {/* Card de Cambio de Contraseña */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-secondary-container to-secondary p-6 text-on-secondary-container flex items-center gap-md">
              <div className="p-xs bg-black/5 rounded-lg">
                <Icon name="lock" size="24px" className="text-secondary-fixed-dim" />
              </div>
              <div>
                <h2 className="text-title-lg font-bold">Cambiar Contraseña</h2>
                <p className="text-body-xs text-on-secondary-variant mt-0.5">Mejora la seguridad de tu cuenta.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPassword(onChangePasswordSubmit)} className="p-lg space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {/* Contraseña Actual */}
                <Input
                  label="Contraseña Actual"
                  type="password"
                  icon="key"
                  placeholder="Contraseña actual"
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />

                {/* Nueva Contraseña */}
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  icon="lock"
                  placeholder="Mínimo 8 caracteres"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />

                {/* Confirmar Nueva Contraseña */}
                <Input
                  label="Confirmar Nueva"
                  type="password"
                  icon="lock_reset"
                  placeholder="Repetir contraseña"
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
              </div>

              <div className="flex justify-end pt-sm border-t border-outline-variant/10">
                <Button type="submit" variant="secondary" loading={isChangingPassword} icon={<Icon name="security" size="20px" />}>
                  Actualizar Contraseña
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
