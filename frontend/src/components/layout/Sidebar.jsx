import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Icon from '../ui/Icon';
import toast from 'react-hot-toast';
import bandera from '/bandera.webp';
import comunas from '/comunas.webp';

const navigation = [
  { name: 'Dashboard', icon: 'dashboard', path: '/', roles: ['admin', 'JEFE_COMUNIDAD', 'LIDER_CALLE'] },
  { name: 'Comunidades', icon: 'home_work', path: '/comunidades', roles: ['admin', 'JEFE_COMUNIDAD'] },
  { name: 'Habitantes', icon: 'groups', path: '/habitantes', roles: ['admin', 'JEFE_COMUNIDAD', 'LIDER_CALLE'] },
  { name: 'Usuarios', icon: 'admin_panel_settings', path: '/usuarios', roles: ['admin'] },
  { name: 'Auditoría', icon: 'history', path: '/auditoria', roles: ['admin'] },
];

/**
 * Sidebar de navegación principal.
 */
export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  const filteredNavigation = navigation.filter((item) =>
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col h-screen w-64
          bg-primary border-r border-outline-variant/30 shadow-md
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-lg flex flex-col items-center gap-sm">
          <div className="w-20 h-16 flex items-center justify-center text-primary">
            <img src={bandera} alt="Logo" className="w-24" />
          </div>
          <div className="text-center">
            <img src={comunas} alt="Logo" className="w-40" />
          </div>
        </div>
        <p className='text-white uppercase font-bold text-center px-md py-sm border-y border-outline-variant/20'>Urb. Jose L. Chirino</p>

        <nav className="flex-1 px-md py-lg space-y-xs overflow-y-auto">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-sm font-label-lg text-label-lg
                 transition-all duration-200 cursor-pointer rounded-lg
                 ${isActive
                  ? 'bg-white/90 text-primary border-l-4 border-yellow-500'
                  : 'text-white/70 hover:bg-primary-container/10 hover:text-white  active:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-md mt-auto border-t border-outline-variant/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-md text-white/70 px-md py-sm
                       font-label-lg text-label-lg w-full hover:text-yellow-300 transition-colors cursor-pointer rounded-lg"
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
