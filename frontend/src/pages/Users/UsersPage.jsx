import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUsers, useDeleteUser, useUpdateUser } from '../../hooks/useUserQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'JEFE_COMUNIDAD');
  if (!currentUser || !isAuthorized) {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  const [roleFilter, setRoleFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = currentUser?.role === 'admin';
  const isJefeComunidad = currentUser?.role === 'JEFE_COMUNIDAD';

  const { data, isLoading } = useUsers(currentPage, {
    role: roleFilter || undefined,
    estado: estadoFilter || undefined,
  });
  const users = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const { mutateAsync: deleteUser } = useDeleteUser();
  const { mutateAsync: updateUser } = useUpdateUser();

  // Filtrar localmente por búsqueda de texto (nombre, apellido, cédula, email)
  const filteredUsers = users.filter((user) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const cedula = (user.cedula || '').toLowerCase();

    return fullName.includes(term) || email.includes(term) || cedula.includes(term);
  });

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
    }
  };

  // Toggle del estado de un usuario (activar / desactivar)
  const handleToggleEstado = async (user) => {
    if (!isAdmin && !isJefeComunidad) return;

    if (user._id === currentUser._id) {
      toast.error('No puede modificar el estado de su propia cuenta.');
      return;
    }

    const nuevoEstado = user.estado === 'activo' ? 'inactivo' : 'activo';
    const actionLabel = nuevoEstado === 'activo' ? 'activar' : 'desactivar';

    if (!window.confirm(`¿Está seguro de que desea ${actionLabel} a este usuario?`)) {
      return;
    }

    try {
      if (nuevoEstado === 'inactivo') {
        // El endpoint DELETE desactiva al usuario
        await deleteUser(user._id);
        toast.success('Usuario desactivado exitosamente.');
      } else {
        // Para activar, usamos PUT
        await updateUser({ id: user._id, data: { estado: 'activo' } });
        toast.success('Usuario activado exitosamente.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Error al ${actionLabel} al usuario.`);
    }
  };

  // Badge estético para Roles
  const renderRoleBadge = (role) => {
    const config = {
      admin: {
        label: 'Administrador',
        style: 'bg-primary/10 text-primary border-primary/20',
      },
      JEFE_COMUNIDAD: {
        label: 'Jefe de Comunidad',
        style: 'bg-secondary/10 text-secondary border-secondary/20',
      },
      LIDER_CALLE: {
        label: 'Líder de Calle',
        style: 'bg-tertiary/10 text-tertiary border-tertiary/20',
      },
    };

    const entry = config[role] || { label: role, style: 'bg-surface-container/60 text-on-surface border-outline-variant/10' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${entry.style}`}>
        {entry.label}
      </span>
    );
  };

  // Badge estético para Estado
  const renderEstadoBadge = (estado) => {
    const isActivo = estado === 'activo';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isActivo
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-error-container/30 text-error border-error-container/40'
          }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-primary' : 'bg-error'}`} />
        {isActivo ? 'Activo' : 'Inactivo'}
      </span>
    );
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary">
            {isJefeComunidad ? 'Líderes de Calle' : 'Gestión de Usuarios'}
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            {isJefeComunidad
              ? 'Administración de líderes de calle de su comunidad.'
              : 'Administración y control de accesos al sistema institucional.'}
          </p>
        </div>

        {(isAdmin || isJefeComunidad) && (
          <Button
            onClick={() => navigate('/usuarios/nuevo')}
            icon={<Icon name="person_add" size="20px" />}
            className="shadow-sm active:scale-95 transition-all self-start md:self-auto"
          >
            {isJefeComunidad ? 'Nuevo Líder de Calle' : 'Nuevo Usuario'}
          </Button>
        )}
      </div>

      {/* Tarjeta de Filtros y Búsqueda */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/10 shadow-sm space-y-md">
        <div className={`grid grid-cols-1 ${isJefeComunidad ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-md`}>
          {/* Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              <Icon name="search" size="20px" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
 
          {/* Filtro por Rol */}
          {!isJefeComunidad && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <Icon name="badge" size="20px" />
              </span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos los Roles</option>
                <option value="admin">Administrador</option>
                <option value="JEFE_COMUNIDAD">Jefe de Comunidad</option>
                <option value="LIDER_CALLE">Líder de Calle</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <Icon name="arrow_drop_down" />
              </span>
            </div>
          )}
 
          {/* Filtro por Estado */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="toggle_on" size="20px" />
            </span>
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="arrow_drop_down" />
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-md">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-body-sm text-on-surface-variant font-medium">Cargando lista de usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-sm text-center">
              <div className="w-16 h-16 rounded-full bg-outline-variant/10 text-outline flex items-center justify-center">
                <Icon name="group_off" size="36px" />
              </div>
              <h3 className="text-label-lg font-bold text-on-surface">No se encontraron usuarios</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm">
                No hay usuarios registrados con los criterios seleccionados en este momento.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label-lg text-xs uppercase tracking-wider">
                  <th className="py-md px-lg">Usuario</th>
                  <th className="py-md px-lg">Cédula</th>
                  <th className="py-md px-lg">Rol</th>
                  <th className="py-md px-lg">Estado</th>
                  {(isAdmin || isJefeComunidad) && <th className="py-md px-lg text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                {filteredUsers.map((user) => {
                  const fullName = `${user.nombre} ${user.apellido}`;
                  return (
                    <tr
                      key={user._id}
                      onClick={() => navigate(`/usuarios/${user._id}`)}
                      className="hover:bg-primary-container/5 transition-colors cursor-pointer"
                    >
                      <td className="py-md px-lg flex items-center gap-sm">
                        <Avatar name={fullName} size="md" />
                        <div>
                          <p className="font-bold text-primary">{fullName}</p>
                          <p className="text-xs text-on-surface-variant">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-md px-lg font-medium text-on-surface">{user.cedula}</td>
                      <td className="py-md px-lg">{renderRoleBadge(user.role)}</td>
                      <td className="py-md px-lg">{renderEstadoBadge(user.estado)}</td>
                       {(isAdmin || isJefeComunidad) && (
                        <td className="py-md px-lg text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEstado(user);
                            }}
                            disabled={user._id === currentUser._id}
                            className={`p-1.5 rounded-lg border transition-all inline-flex items-center gap-1 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${user.estado === 'activo'
                              ? 'border-error/20 text-error hover:bg-error/5'
                              : 'border-primary/20 text-primary hover:bg-primary/5'
                              }`}
                            title={user.estado === 'activo' ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                          >
                            <Icon name={user.estado === 'activo' ? 'block' : 'check_circle'} size="18px" />
                            <span className="text-xs font-semibold">
                              {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                            </span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!isLoading && pagination.pages > 1 && (
          <div className="bg-surface-container-low px-lg py-sm border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant font-medium">
              Página {pagination.page} de {pagination.pages} (Total: {pagination.total} usuarios)
            </span>
            <div className="flex gap-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                icon={<Icon name="chevron_left" size="18px" />}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pagination.pages}
                onClick={() => handlePageChange(currentPage + 1)}
                icon={<Icon name="chevron_right" size="18px" />}
                iconPosition="right"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
