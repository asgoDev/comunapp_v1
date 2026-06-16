import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAuditoriaStore } from '../../stores/auditoriaStore';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function AuditoriaPage() {
  const currentUser = useAuthStore((s) => s.user);

  if (!currentUser || currentUser.role !== 'admin') {
    toast.error('No tiene permisos para acceder a esta sección.');
    return <Navigate to="/" replace />;
  }

  const { logs, pagination, isLoading, fetchLogs } = useAuditoriaStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [moduloFilter, setModuloFilter] = useState('');
  const [accionFilter, setAccionFilter] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('');

  useEffect(() => {
    const filters = {};
    if (moduloFilter) filters.modulo = moduloFilter;
    if (accionFilter) filters.accion = accionFilter;
    if (resultadoFilter) filters.resultado = resultadoFilter;

    fetchLogs(currentPage, filters).catch((err) => {
      console.error(err);
      toast.error('Error al cargar los logs de auditoría');
    });
  }, [fetchLogs, currentPage, moduloFilter, accionFilter, resultadoFilter]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
    }
  };

  const renderResultadoBadge = (resultado) => {
    const isExitoso = resultado === 'EXITOSO';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          isExitoso
            ? 'bg-primary/10 text-primary border-primary/20'
            : 'bg-error-container/30 text-error border-error-container/40'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isExitoso ? 'bg-primary' : 'bg-error'}`} />
        {resultado}
      </span>
    );
  };

  const renderAccionBadge = (accion) => {
    const styles = {
      CREAR: 'bg-primary/10 text-primary border-primary/20',
      ACTUALIZAR: 'bg-secondary-container/40 text-on-secondary-container border-secondary-container/30',
      ELIMINAR: 'bg-error-container/30 text-error border-error-container/40',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          styles[accion] || 'bg-surface-container text-on-surface border-outline-variant/20'
        }`}
      >
        {accion}
      </span>
    );
  };

  const renderModuloBadge = (modulo) => {
    const icons = {
      AUTH: 'lock',
      USERS: 'group',
      DASHBOARD: 'dashboard',
    };
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant border border-outline-variant/20">
        <Icon name={icons[modulo] || 'category'} size="14px" />
        {modulo}
      </span>
    );
  };

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getUserLabel = (log) => {
    if (log.usuario_id && typeof log.usuario_id === 'object') {
      return `${log.usuario_id.nombre} ${log.usuario_id.apellido}`;
    }
    return log.usuario_id || '—';
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary">
            Auditoría del Sistema
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Registro de acciones realizadas en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-sm self-start md:self-auto">
          <div className="flex items-center gap-xs bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <Icon name="event_note" size="18px" className="text-primary" />
            <span className="text-label-sm font-semibold text-on-surface-variant">
              {pagination.total || 0} registros
            </span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/10 shadow-sm space-y-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Filtro por Módulo */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="category" size="20px" />
            </span>
            <select
              value={moduloFilter}
              onChange={(e) => {
                setModuloFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos los Módulos</option>
              <option value="AUTH">Auth</option>
              <option value="USERS">Users</option>
              <option value="DASHBOARD">Dashboard</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="arrow_drop_down" />
            </span>
          </div>

          {/* Filtro por Acción */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="bolt" size="20px" />
            </span>
            <select
              value={accionFilter}
              onChange={(e) => {
                setAccionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">Todas las Acciones</option>
              <option value="CREAR">Crear</option>
              <option value="ACTUALIZAR">Actualizar</option>
              <option value="ELIMINAR">Eliminar</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="arrow_drop_down" />
            </span>
          </div>

          {/* Filtro por Resultado */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="check_circle" size="20px" />
            </span>
            <select
              value={resultadoFilter}
              onChange={(e) => {
                setResultadoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos los Resultados</option>
              <option value="EXITOSO">Exitoso</option>
              <option value="FALLIDO">Fallido</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name="arrow_drop_down" />
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-md">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-body-sm text-on-surface-variant font-medium">
                Cargando logs de auditoría...
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-sm text-center">
              <div className="w-16 h-16 rounded-full bg-outline-variant/10 text-outline flex items-center justify-center">
                <Icon name="receipt_long" size="36px" />
              </div>
              <h3 className="text-label-lg font-bold text-on-surface">
                No se encontraron registros
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm">
                No hay eventos de auditoría con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-label-lg text-xs uppercase tracking-wider">
                  <th className="py-md px-lg">Fecha</th>
                  <th className="py-md px-lg">Usuario</th>
                  <th className="py-md px-lg">Módulo</th>
                  <th className="py-md px-lg">Acción</th>
                  <th className="py-md px-lg">Resultado</th>
                  <th className="py-md px-lg">Código</th>
                  <th className="py-md px-lg">Recurso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-primary-container/5 transition-colors"
                  >
                    <td className="py-md px-lg whitespace-nowrap text-on-surface-variant">
                      {formatFecha(log.fecha)}
                    </td>
                    <td className="py-md px-lg font-medium">
                      {getUserLabel(log)}
                    </td>
                    <td className="py-md px-lg">
                      {renderModuloBadge(log.modulo)}
                    </td>
                    <td className="py-md px-lg">
                      {renderAccionBadge(log.accion)}
                    </td>
                    <td className="py-md px-lg">
                      {renderResultadoBadge(log.resultado)}
                    </td>
                    <td className="py-md px-lg">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          log.statusCode >= 400
                            ? 'bg-error-container/20 text-error'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-md px-lg text-on-surface-variant text-xs font-mono truncate max-w-[160px]">
                      {log.url || '—'}
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
              Página {pagination.page} de {pagination.pages} (Total:{' '}
              {pagination.total} registros)
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
