import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { loginSchema } from '../../validations/auth.js';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      // Si es solo números, anteponer "V-" (personal venezolano)
      let identifier = data.identifier.trim();
      if (/^\d+$/.test(identifier)) {
        identifier = `V-${identifier}`;
      }

      await login(identifier, data.password);
      toast.success('¡Bienvenido al sistema!');
      navigate('/', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel Izquierdo: Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        {/* <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary animate-gradient" /> */}
        <div className="absolute inset-0 bg-[#006a3bff] bg-cover bg-[position:25%_center] bg-no-repeat blur-[1px]" />

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border-2 border-white/30 rounded-full" />
          <div className="absolute bottom-32 right-16 w-48 h-48 border-2 border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 border-2 border-white/25 rounded-full animate-pulse-ring" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="w-36 h-36 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-2xl border border-white/20">
            <Icon name="shield" className="text-6xl text-white" />
          </div>

          <h1 className="text-display-lg font-display-lg text-center mb-4">
            Plantilla Web
          </h1>
          <p className="text-body-lg text-center text-white/80 max-w-md leading-relaxed">
            Autenticación JWT, usuarios y auditoría
          </p>

          {/* Decorative cards */}
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm w-full">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Icon name="shield" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Seguro</p>
              <p className="text-xs text-white/60">Autenticación JWT</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Icon name="speed" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Eficiente</p>
              <p className="text-xs text-white/60">Gestión en tiempo real</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Icon name="group" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Usuarios</p>
              <p className="text-xs text-white/60">CRUD con roles</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Icon name="monitoring" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Auditoría</p>
              <p className="text-xs text-white/60">Trazabilidad total</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8 gap-2">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-primary-container/20 text-primary">
              <Icon name="shield" className="text-4xl" />
            </div>
            <h1 className="text-headline-md font-headline-md text-primary">Plantilla Web</h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Ingrese sus credenciales para acceder al sistema
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Cédula o Correo Electrónico"
              icon="badge"
              type="text"
              placeholder="12345678 ó usuario@correo.com"
              error={errors.identifier?.message}
              autoComplete="username"
              {...register('identifier')}
            />

            <Input
              label="Contraseña"
              icon="lock"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              autoComplete="current-password"
              {...register('password')}
            />

            <Button
              type="submit"
              loading={isLoading}
              className="w-full py-3.5 text-body-md mt-2"
              icon={<Icon name="login" size="20px" />}
            >
              Ingresar
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-label-sm text-on-surface-variant">
              Sistema protegido. Solo personal autorizado.
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-outline">
              <Icon name="lock" size="14px" />
              <span className="text-[11px]">Conexión segura • TLS 1.3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
