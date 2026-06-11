import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center animate-fade-in-up max-w-md">
        {/* 404 Number */}
        <div className="relative inline-block mb-6">
          <span className="text-[120px] md:text-[160px] font-extrabold text-primary/10 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary-container/10 flex items-center justify-center">
              <Icon name="explore_off" size="48px" className="text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-headline-lg font-headline-lg text-on-surface mb-3">
          Página no encontrada
        </h1>
        <p className="text-body-md text-on-surface-variant mb-8 max-w-sm mx-auto">
          La ruta que buscas no existe o no tienes permisos para acceder a ella.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button
              icon={<Icon name="home" size="18px" />}
              className="w-full sm:w-auto"
            >
              Ir al Inicio
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              icon={<Icon name="login" size="18px" />}
              className="w-full sm:w-auto"
            >
              Iniciar Sesión
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-label-sm text-outline">
          SIGAS • Portal Institucional
        </p>
      </div>
    </div>
  );
}
