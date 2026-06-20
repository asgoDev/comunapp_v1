import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { loginSchema } from '../../validations/auth.js';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import logo from '/mpp_comunas.webp'
import { Logo } from '../../components/ui/Logo'

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
      <div className="bg-primary hidden lg:flex lg:flex-col lg:justify-center lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}


        {/* Content */}
        <div className=" flex-1  max-h-[700px] relative z-10 flex flex-col justify-between items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="w-72  flex items-center justify-center">
            <img src={logo} alt="Logo MPP comunas" className='w-full h-full object-contain' />
          </div>

          <div className="">
            {/* <h1 className="text-display-lg font-display-lg text-center mb-4">
              ComunApp
            </h1> */}
            <Logo />
            <p className="text-body-lg text-center text-white/80 max-w-md leading-relaxed">
              La solución integral para la gestión comunitaria
            </p>
          </div>

          {/* Decorative cards */}
          <div className=" grid grid-cols-1 gap-4 max-w-sm w-full">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-center gap-2">
              <Icon name="shield" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Seguro</p>
              <p className="text-xs text-white/60">Autenticación JWT</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-center gap-2">
              <Icon name="speed" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Eficiente</p>
              <p className="text-xs text-white/60">Gestión en tiempo real</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-center gap-2">
              <Icon name="group" className="text-secondary-container mb-2" />
              <p className="text-sm font-semibold">Usuarios</p>
              <p className="text-xs text-white/60">CRUD con roles</p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-6 gap-8">
            <div className="w-80 h-30 px-4 py-2 rounded-xl flex items-center justify-center bg-primary text-primary">
              <img src={logo} alt="Logo MPP comunas" className='w-full h-full object-contain' />
            </div>
            {/* <h1 className="text-4xl font-headline-md text-primary font-black ">ComunApp</h1> */}
            <Logo inverted={true} />

          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-headline-md lg:text-headline-lg font-headline-md text-primary mb-2 font-black">
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
