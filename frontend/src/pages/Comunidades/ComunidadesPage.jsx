import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useComunidades, useDeleteComunidad } from '../../hooks/useComunidadQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function ComunidadesPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  // Redirigir si no tiene rol autorizado
  const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'JEFE_COMUNIDAD');
  
  if (!currentUser || !isAuthorized) {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  if (currentUser.role === 'JEFE_COMUNIDAD') {
    return <Navigate to={`/comunidades/${currentUser.comunidad?._id || currentUser.comunidad}/resumen`} replace />;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useComunidades(currentPage);
  const comunidades = data?.comunidades || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };
  const { mutateAsync: deleteComunidad } = useDeleteComunidad();

  const isAdmin = currentUser?.role === 'admin';

  // Filtrado local
  const filteredComunidades = comunidades.filter((comunidad) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const nombre = (comunidad.nombre || '').toLowerCase();
    const municipio = (comunidad.municipio || '').toLowerCase();
    const estado = (comunidad.estado || '').toLowerCase();
    const parroquia = (comunidad.parroquia || '').toLowerCase();
    const ciudadPueblo = (comunidad.ciudadPueblo || '').toLowerCase();

    return (
      nombre.includes(term) ||
      municipio.includes(term) ||
      estado.includes(term) ||
      parroquia.includes(term) ||
      ciudadPueblo.includes(term)
    );
  });

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
    }
  };

  const handleDeactivate = async (comunidad) => {
    if (!isAdmin) return;

    if (!window.confirm(`¿Está seguro de que desea desactivar la comunidad "${comunidad.nombre}"?`)) {
      return;
    }

    try {
      await deleteComunidad(comunidad._id);
      toast.success('Comunidad desactivada exitosamente.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desactivar la comunidad.');
    }
  };



  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary">Gestión de Comunidades</h2>
          <p className="text-body-sm text-on-surface-variant">
            Administración de comunidades e información territorial del sistema.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => navigate('/comunidades/nueva')}
            icon={<Icon name="add_home" size="20px" />}
            className="shadow-sm active:scale-95 transition-all self-start md:self-auto"
          >
            Nueva Comunidad
          </Button>
        )}
      </div>

      {/* Tarjeta de Filtros y Búsqueda */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/10 shadow-sm space-y-md">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            <Icon name="search" size="20px" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, municipio, estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-md">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-body-sm text-on-surface-variant font-medium">Cargando comunidades...</p>
            </div>
          ) : filteredComunidades.length === 0 ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-sm text-center">
              <div className="w-16 h-16 rounded-full bg-outline-variant/10 text-outline flex items-center justify-center">
                <Icon name="holiday_village" size="36px" />
              </div>
              <h3 className="text-label-lg font-bold text-on-surface">No se encontraron comunidades</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm">
                No hay comunidades registradas con los criterios seleccionados en este momento.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label-lg text-xs uppercase tracking-wider">
                  <th className="py-md px-lg">Comunidad</th>
                  <th className="py-md px-lg">Ubicación</th>
                  <th className="py-md px-lg">Circuito / Comuna</th>
                  <th className="py-md px-lg text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                {filteredComunidades.map((comunidad) => (
                  <tr
                    key={comunidad._id}
                    onClick={() => navigate(`/comunidades/${comunidad._id}/resumen`)}
                    className="transition-colors hover:bg-primary-container/5 cursor-pointer"
                  >
                    <td className="py-md px-lg">
                      <div className="flex items-center gap-sm">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Icon name="location_city" size="22px" />
                        </div>
                        <div>
                          <p className="font-bold text-primary">{comunidad.nombre}</p>
                          <p className="text-xs text-on-surface-variant">{comunidad.ciudadPueblo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-md px-lg">
                      <p className="font-medium text-on-surface">{comunidad.parroquia}</p>
                      <p className="text-xs text-on-surface-variant">{comunidad.municipio}, {comunidad.estado}</p>
                    </td>
                    <td className="py-md px-lg text-on-surface-variant font-medium">
                      {comunidad.circuitoComuna || <span className="text-outline italic">No asignado</span>}
                    </td>
                    <td className="py-md px-lg text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-xs">


                        {/* Acciones de Admin */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => navigate(`/comunidades/${comunidad._id}`)}
                              className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-outline-variant/10 transition-all inline-flex items-center gap-1 cursor-pointer select-none active:scale-95"
                              title="Editar Comunidad"
                            >
                              <Icon name="edit" size="18px" />
                              <span className="text-xs font-semibold hidden md:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeactivate(comunidad)}
                              className="p-1.5 rounded-lg border border-error/20 text-error hover:bg-error/5 transition-all inline-flex items-center gap-1 cursor-pointer select-none active:scale-95"
                              title="Desactivar Comunidad"
                            >
                              <Icon name="delete" size="18px" />
                              <span className="text-xs font-semibold hidden md:inline">Desactivar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!isLoading && pagination.pages > 1 && (
          <div className="bg-surface-container-low px-lg py-sm border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant font-medium">
              Página {pagination.page} de {pagination.pages} (Total: {pagination.total} comunidades)
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
