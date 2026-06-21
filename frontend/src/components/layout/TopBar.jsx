import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import { Logo } from '../ui/Logo';

export default function TopBar({ onMenuToggle }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fullName = user ? `${user.nombre} ${user.apellido}` : '';

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'JEFE_COMUNIDAD'
        ? 'Jefe de Comunidad'
        : user?.role === 'LIDER_CALLE'
          ? 'Líder de Calle'
          : '';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleProfileClick = () => {
    setOpen(false);
    navigate('/perfil');
  };

  const handleLogoutClick = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex justify-between items-center w-full px-lg h-16 sticky top-0 z-30 bg-surface shadow-sm font-montserrat">
      <div className="flex items-center md:gap-lg">
        <button
          onClick={onMenuToggle}
          className="p-sm pl-0 text-on-surface-variant hover:text-primary transition-colors md:hidden flex items-center cursor-pointer"
        >
          <Icon name="menu" />
        </button>
        <Logo inverted={true} size="text-xl md:text-2xl" />
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-sm cursor-pointer select-none group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-label-lg text-primary font-bold leading-tight capitalize group-hover:text-primary-container transition-colors">
              {fullName}
            </p>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase">
              {roleLabel}
            </p>
          </div>

          <Avatar 
            name={fullName} 
            size="md" 
            className="group-hover:border-primary transition-colors" 
          />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-surface border border-outline-variant/30 shadow-lg overflow-hidden animate-fade-in-up z-50">
            {/* Header del Dropdown */}
            <div className="px-md py-sm border-b border-outline-variant/20 bg-surface-container text-left">
              <p className="text-label-lg text-on-surface font-bold capitalize truncate">
                {fullName}
              </p>
              <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-wider font-semibold">
                {roleLabel}
              </p>
            </div>
            
            {/* Opciones */}
            <div className="p-xs space-y-[2px]">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-sm px-md py-sm text-body-sm text-on-surface hover:bg-primary/10 hover:text-primary rounded-md transition-colors text-left cursor-pointer"
              >
                <Icon name="person" size="18px" />
                <span>Mi Perfil</span>
              </button>
              
              <div className="h-[1px] bg-outline-variant/20 my-xs" />
              
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-sm px-md py-sm text-body-sm text-error hover:bg-error/10 rounded-md transition-colors text-left cursor-pointer"
              >
                <Icon name="logout" size="18px" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}