import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Icon from '../ui/Icon';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', icon: 'dashboard', path: '/' },
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
          bg-surface-container-lowest border-r border-outline-variant/30 shadow-md
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-lg flex flex-col items-center gap-sm">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-primary-container/20 text-primary">
            <Icon name="shield" className="text-4xl" />
          </div>
          <hr className="w-[75%] h-px bg-primary" />
          <div className="text-center">
            <h2 className="text-headline-sm font-headline-sm text-primary">Plantilla</h2>
            <p className="text-label-sm text-on-surface-variant">Login &amp; Usuarios</p>
          </div>
        </div>

        <nav className="flex-1 px-md py-lg space-y-xs overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-sm font-label-lg text-label-lg
                 transition-all duration-200 cursor-pointer rounded-lg
                 ${isActive
                  ? 'bg-secondary-container/20 text-primary border-l-4 border-secondary'
                  : 'text-on-surface-variant hover:bg-primary-container/10 hover:text-primary active:translate-x-1'
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

          {user?.role === 'admin' && (
            <>
              <NavLink
                to="/usuarios"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-md px-md py-sm font-label-lg text-label-lg
                   transition-all duration-200 cursor-pointer rounded-lg
                   ${isActive
                    ? 'bg-secondary-container/20 text-primary border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-primary-container/10 hover:text-primary active:translate-x-1'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name="admin_panel_settings" filled={isActive} />
                    <span>Usuarios</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/auditoria"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-md px-md py-sm font-label-lg text-label-lg
                   transition-all duration-200 cursor-pointer rounded-lg
                   ${isActive
                    ? 'bg-secondary-container/20 text-primary border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-primary-container/10 hover:text-primary active:translate-x-1'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name="history" filled={isActive} />
                    <span>Auditoría</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-md mt-auto border-t border-outline-variant/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-md text-on-surface-variant px-md py-sm
                       font-label-lg text-label-lg w-full hover:text-error transition-colors cursor-pointer rounded-lg"
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
