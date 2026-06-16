import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { dashboardService } from '../../services/dashboardService';
import Icon from '../../components/ui/Icon';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState({
    usersCount: 0,
    activeUsersCount: 0,
    auditCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await dashboardService.getStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const statCards = [
    {
      label: 'Usuarios registrados',
      value: isLoading ? '—' : stats.usersCount,
      icon: 'group',
      trend: 'Total en el sistema',
      colorClass:
        'text-primary bg-primary-container/10 group-hover:bg-primary-container group-hover:text-white',
    },
    {
      label: 'Usuarios activos',
      value: isLoading ? '—' : stats.activeUsersCount,
      icon: 'verified_user',
      trend: 'Cuentas con estado activo',
      colorClass:
        'text-secondary bg-secondary-container/20 group-hover:bg-secondary group-hover:text-white',
    },
    {
      label: 'Eventos de auditoría',
      value: isLoading ? '—' : stats.auditCount,
      icon: 'history',
      trend: 'Acciones registradas',
      colorClass:
        'text-tertiary bg-tertiary-fixed-dim/20 group-hover:bg-tertiary group-hover:text-white',
    },
  ];

  const quickActions = [
    {
      icon: 'person_add',
      title: 'Nuevo usuario',
      desc: 'Registrar cuenta (solo admin)',
      path: '/usuarios/nuevo',
      adminOnly: true,
    },
    {
      icon: 'group',
      title: 'Gestionar usuarios',
      desc: 'Listado y edición',
      path: '/usuarios',
      adminOnly: true,
    },
    {
      icon: 'account_circle',
      title: 'Mi perfil',
      desc: 'Datos de sesión actual',
      path: '/',
      adminOnly: false,
    },
    {
      icon: 'shield',
      title: 'Auditoría',
      desc: 'Registro de acciones del sistema',
      path: '/auditoria',
      adminOnly: true,
    },
  ].filter((action) => !action.adminOnly || user?.role === 'admin');

  return (
    <div className="space-y-lg animate-fade-in-up">
      <div className="bg-gradient-to-r from-primary to-primary-container rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body-md text-white/80 mb-1">{greeting()},</p>
            <h1 className="text-headline-lg font-headline-lg mb-2">
              {user?.nombre} {user?.apellido}
            </h1>
            <p className="text-body-md text-white/70 max-w-lg">
              Bienvenido a la plantilla full-stack con autenticación JWT, gestión de usuarios y
              auditoría de acciones.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/15 px-4 py-2 rounded-lg backdrop-blur-sm">
            <Icon name="verified_user" size="20px" />
            <span className="text-label-lg font-bold uppercase">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant/10 
                       flex flex-col justify-between group hover:shadow-md transition-shadow h-32"
          >
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant font-label-lg uppercase tracking-wider text-xs">
                {card.label}
              </span>
              <div className={`p-xs rounded-lg transition-colors ${card.colorClass}`}>
                <Icon name={card.icon} />
              </div>
            </div>
            <div>
              <h3 className="text-headline-lg font-headline-lg text-on-surface">{card.value}</h3>
              <p className="text-label-sm text-on-surface-variant">{card.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.path}
            className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant/10 
                       hover:shadow-md hover:border-primary/20 transition-all text-left group cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center mb-3
                          group-hover:bg-primary group-hover:text-white transition-colors"
            >
              <Icon name={action.icon} />
            </div>
            <h4 className="text-label-lg font-bold text-on-surface">{action.title}</h4>
            <p className="text-label-sm text-on-surface-variant mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
