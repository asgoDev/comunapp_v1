import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHabitantes, useDeleteHabitante } from '../../hooks/useHabitanteQueries';
import { useComunidadById, useComunidadesDropdown } from '../../hooks/useComunidadQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import ViewToggle from '../../components/ui/ViewToggle';
import Pagination from '../../components/ui/Pagination';
import { exportHabitantesToPDF } from '../../utils/pdfExport';
import { calculateAge, formatBirthDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CALLES_FIJAS = ['Principal', 'Calle 1', 'Calle 2', 'Calle 3', 'Calle 4'];

const MAX_CASAS_PER_PAGE = 20;
const MAX_FILAS_PER_PAGE = 40;

export default function HabitantesPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const isLiderCalle = currentUser?.role === 'LIDER_CALLE';
  const isAdmin = currentUser?.role === 'admin';
  const userCalle = currentUser?.calle || '';

  const [selectedComunidadId, setSelectedComunidadId] = useState('');
  const [selectedCalle, setSelectedCalle] = useState(isLiderCalle ? userCalle : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('casas'); // 'casas' | 'listado'
  const [currentPage, setCurrentPage] = useState(1);

  // Obtener listado de comunidades si es administrador
  const { data: comunidadesList } = useComunidadesDropdown();

  // Determinar la comunidad activa para la consulta
  const activeComunidadId = isAdmin ? selectedComunidadId : (currentUser?.comunidad?._id || (typeof currentUser?.comunidad === 'string' ? currentUser.comunidad : null));

  // Cargar datos geográficos de la comunidad seleccionada/activa
  const { data: comunidadInfo } = useComunidadById(activeComunidadId);

  const filters = {};
  if (selectedCalle) {
    filters.calle = selectedCalle;
  }
  // Enviar el ID de comunidad activo
  if (isAdmin) {
    // Si es administrador y no ha seleccionado comunidad, enviar un ID dummy que no devuelva registros
    filters.comunidadId = selectedComunidadId || '000000000000000000000000';
  } else if (activeComunidadId) {
    filters.comunidadId = activeComunidadId;
  }
  // Establecer límite alto para cargar todos los habitantes de la comunidad y realizar paginación y exportación locales fiables
  filters.limit = 9999;

  const { data, isLoading, isError } = useHabitantes(1, filters);
  const habitantes = data?.habitantes || [];
  const { mutateAsync: deleteHabitante } = useDeleteHabitante();

  // Resetear la página actual a 1 si cambian los filtros principales
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCalle, selectedComunidadId, searchQuery, viewMode]);

  useEffect(() => {
    if (isError) {
      toast.error('Error al cargar la lista de habitantes.');
    }
  }, [isError]);

  // Filtrar habitantes localmente
  const filteredHabitantes = habitantes.filter((h) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    if (viewMode === 'casas') {
      // Filtrado exclusivo por número de casa (coincidencia parcial)
      const numeroCasa = (h.numeroCasa || '').toLowerCase();
      return numeroCasa.includes(term);
    } else {
      // Filtrado general (nombre, cédula, calle o número de casa)
      const fullName = `${h.nombres} ${h.apellidos}`.toLowerCase();
      const cedula = (h.cedula || '').toLowerCase();
      const calle = (h.calle || '').toLowerCase();
      const numeroCasa = (h.numeroCasa || '').toLowerCase();
      return (
        fullName.includes(term) ||
        cedula.includes(term) ||
        calle.includes(term) ||
        numeroCasa.includes(term)
      );
    }
  });

  const uniqueCalles = (isAdmin && !selectedComunidadId) ? [] : Array.from(
    new Set([
      ...CALLES_FIJAS,
      ...habitantes.map((h) => h.calle).filter(Boolean)
    ])
  ).sort();

  // Agrupación por calle y casa (para vista 'casas')
  const casas = Object.entries(
    filteredHabitantes.reduce((acc, h) => {
      const key = `${h.calle || 'Sin Calle'}|||${h.numeroCasa || 'Sin Número'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(h);
      return acc;
    }, {})
  ); // Eliminado ordenamiento manual del frontend; el backend ya los devuelve ordenados por calle y casa numéricamente.

  // Paginación para vista Casas
  const totalPagesCasas = Math.ceil(casas.length / MAX_CASAS_PER_PAGE);
  const paginatedCasas = casas.slice(
    (currentPage - 1) * MAX_CASAS_PER_PAGE,
    currentPage * MAX_CASAS_PER_PAGE
  );

  // Paginación para vista Listado
  const totalPagesListado = Math.ceil(filteredHabitantes.length / MAX_FILAS_PER_PAGE);
  const paginatedHabitantes = filteredHabitantes.slice(
    (currentPage - 1) * MAX_FILAS_PER_PAGE,
    currentPage * MAX_FILAS_PER_PAGE
  );

  const handleCreateNew = () => {
    const queryParams = new URLSearchParams();
    if (selectedCalle) {
      queryParams.append('calle', selectedCalle);
    }
    navigate(`/habitantes/nuevo?${queryParams.toString()}`);
  };

  const handleDelete = async (habitante) => {
    const fullName = `${habitante.nombres} ${habitante.apellidos}`;
    if (!window.confirm(`¿Está seguro de eliminar a ${fullName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteHabitante(habitante._id);
      toast.success('Habitante eliminado exitosamente.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar el habitante.');
    }
  };

  const handleDownloadPDF = () => {
    if (filteredHabitantes.length === 0) {
      toast.error('No hay habitantes en la lista para exportar.');
      return;
    }
    try {
      exportHabitantesToPDF(filteredHabitantes, {
        comunidadInfo,
        currentUser,
        selectedCalle,
      });
      toast.success('Reporte PDF descargado exitosamente.');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte PDF.');
    }
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary">Casas y Habitantes</h2>
          <p className="text-body-sm text-on-surface-variant mt-0.5 font-medium">
            {isLiderCalle
              ? `Calle asignada: ${userCalle} — Comunidad: ${currentUser?.comunidad?.nombre || 'Mi Comunidad'}`
              : `Comunidad: ${comunidadInfo?.nombre || currentUser?.comunidad?.nombre || 'Todas las Comunidades'}`}
          </p>
        </div>

        <div className="flex items-center gap-sm self-start md:self-auto">
          {viewMode === 'listado' && (
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={filteredHabitantes.length === 0}
              icon={<Icon name="download" size="20px" />}
              className="active:scale-95 transition-all bg-surface-container-lowest"
            >
              Descargar PDF
            </Button>
          )}

          {(isLiderCalle || isAdmin) && (
            <Button
              onClick={handleCreateNew}
              disabled={isAdmin && !selectedComunidadId}
              icon={<Icon name="person_add" size="20px" />}
              className="shadow-sm active:scale-95 transition-all"
            >
              Registrar Habitante
            </Button>
          )}
        </div>
      </div>

      {/* Tarjeta de Filtros, Selector de Vistas y Búsqueda */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/10 shadow-sm space-y-md">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-md">
          {/* Selectores de Comunidad y Calle */}
          <div className="flex flex-col md:flex-row items-center gap-md flex-1">
            {/* Selector de Comunidad (Solo Administrador) */}
            {isAdmin && (
              <div className="relative w-full md:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="groups" size="20px" />
                </span>
                <select
                  value={selectedComunidadId}
                  onChange={(e) => {
                    setSelectedComunidadId(e.target.value);
                    setSelectedCalle('');
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-10 py-2.5 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="">Seleccione una comunidad...</option>
                  {comunidadesList?.map((com) => (
                    <option key={com._id} value={com._id}>
                      {com.nombre}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="arrow_drop_down" />
                </span>
              </div>
            )}

            {/* Selector de Calle */}
            {isLiderCalle ? (
              <div className="inline-flex items-center gap-sm bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-body-sm font-medium text-on-surface w-full md:w-auto">
                <Icon name="signpost" className="text-primary" />
                <span>Calle asignada: <strong>{userCalle}</strong></span>
              </div>
            ) : (
              <div className="relative w-full md:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="signpost" size="20px" />
                </span>
                <select
                  value={selectedCalle}
                  onChange={(e) => setSelectedCalle(e.target.value)}
                  disabled={isAdmin && !selectedComunidadId}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-10 py-2.5 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Todas las calles</option>
                  {uniqueCalles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                  <Icon name="arrow_drop_down" />
                </span>
              </div>
            )}
          </div>

          {/* Selector de Vista (Casas / Listado) */}
          <div className="flex justify-start md:justify-end">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'casas', label: 'Casas', icon: 'home' },
                { value: 'listado', label: 'Listado', icon: 'table_rows' },
              ]}
            />
          </div>
        </div>

        {/* Input de Búsqueda contextual */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            <Icon name="search" size="20px" />
          </span>
          <input
            type="text"
            placeholder={
              viewMode === 'casas'
                ? 'Buscar por número de casa (ej: 44)...'
                : 'Buscar por nombre, cédula, calle o número de casa...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={(isLiderCalle && !selectedCalle) || (isAdmin && !selectedComunidadId)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2.5 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {/* Contenido Dinámico */}
      {isAdmin && !selectedComunidadId ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-outline-variant/10 text-outline flex items-center justify-center mb-sm">
            <Icon name="groups" size="36px" />
          </div>
          <h3 className="text-label-lg font-bold text-on-surface">Seleccione una comunidad</h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
            Por favor, seleccione una comunidad de la lista para ver y gestionar sus casas y habitantes.
          </p>
        </div>
      ) : isLiderCalle && !selectedCalle ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-outline-variant/10 text-outline flex items-center justify-center mb-sm">
            <Icon name="signpost" size="36px" />
          </div>
          <h3 className="text-label-lg font-bold text-on-surface">Seleccione una calle</h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
            Por favor, seleccione una calle de la lista para ver y gestionar las casas y habitantes.
          </p>
        </div>
      ) : isLoading ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm flex flex-col items-center justify-center space-y-md">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-body-sm text-on-surface-variant font-medium">Cargando datos...</p>
        </div>
      ) : (viewMode === 'casas' ? casas.length === 0 : filteredHabitantes.length === 0) ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-outline-variant/10 text-outline flex items-center justify-center mb-sm">
            <Icon name="home_work" size="36px" />
          </div>
          <h3 className="text-label-lg font-bold text-on-surface">
            {viewMode === 'casas' ? 'No se encontraron casas' : 'No se encontraron habitantes'}
          </h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
            No hay registros en la calle o comunidad seleccionada que coincidan con la búsqueda.
          </p>
        </div>
      ) : viewMode === 'casas' ? (
        // VISTA: Casas (Tarjetas)
        <div className="space-y-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
            {paginatedCasas.map(([compoundKey, integrantes]) => {
              const [calleName, casaNum] = compoundKey.split('|||');
              const count = integrantes.length;
              const jefe = integrantes.find((h) => h.jefeFamilia);
              return (
                <div
                  key={compoundKey}
                  onClick={() => navigate(`/habitantes/casa/${casaNum}?calle=${encodeURIComponent(calleName)}`)}
                  className="bg-surface-container-lowest hover:bg-primary-container/5 rounded-xl border border-outline-variant/20 hover:border-primary/30 p-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group animate-fade-in"
                >
                  <div className="flex justify-between items-start mb-md">
                    <div className="flex items-center gap-md">
                      <div className="p-sm bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-all text-primary">
                        <Icon name="home" size="28px" />
                      </div>
                      <div>
                        <h4 className="font-bold text-headline-sm text-on-surface">Casa N.º {casaNum}</h4>
                        <p className="text-body-xs text-on-surface-variant mt-0.5">{calleName}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                      <Icon name="groups" size="14px" />
                      {count} {count === 1 ? 'Habitante' : 'Habitantes'}
                    </span>
                  </div>

                  <div className="border-t border-outline-variant/10 pt-md mt-sm text-body-sm">
                    {jefe ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Jefe de Familia</p>
                        <p className="font-semibold text-primary capitalize">{jefe.nombres} {jefe.apellidos}</p>
                        <p className="text-xs text-on-surface-variant">{jefe.cedula || 'Sin cédula'}</p>
                      </div>
                    ) : (
                      <div className="text-xs text-outline italic flex items-center gap-1">
                        <Icon name="warning" size="14px" />
                        Sin Jefe de Familia asignado
                      </div>
                    )}
                  </div>

                  {/* Micro-animación de hover */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center bg-primary text-white rounded-tl-xl translate-x-8 translate-y-8 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300">
                    <Icon name="arrow_forward" size="16px" />
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPagesCasas}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        // VISTA: Listado (Tabla completa)
        <div className="space-y-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-outline-variant/20 text-on-surface-variant font-label-lg text-xs uppercase tracking-wider select-none">
                    <th className="py-md px-lg">Nombre</th>
                    <th className="py-md px-lg">Cédula</th>
                    <th className="py-md px-lg">Teléfono</th>
                    <th className="py-md px-lg">F. Nacimiento</th>
                    <th className="py-md px-lg">Edad</th>
                    <th className="py-md px-lg">Ubicación (Calle - Casa)</th>
                    <th className="py-md px-lg">Rol Familiar</th>
                    <th className="py-md px-lg">Discapacidad</th>
                    {(isAdmin || isLiderCalle) && <th className="py-md px-lg text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                  {paginatedHabitantes.map((h) => {
                    const fullName = `${h.nombres} ${h.apellidos}`;
                    return (
                      <tr
                        key={h._id}
                        onClick={() => navigate(`/habitantes/${h._id}`)}
                        className="hover:bg-primary-container/5 transition-colors cursor-pointer"
                      >
                        <td className="py-md px-lg font-bold text-primary capitalize whitespace-nowrap">
                          {fullName}
                        </td>
                        <td className="py-md px-lg font-medium text-on-surface whitespace-nowrap">
                          {h.cedula || 'No posee'}
                        </td>
                        <td className="py-md px-lg text-on-surface-variant whitespace-nowrap">
                          {h.telefono || '—'}
                        </td>
                        <td className="py-md px-lg whitespace-nowrap">
                          {h.fechaNacimiento ? formatBirthDate(h.fechaNacimiento) : '—'}
                        </td>
                        <td className="py-md px-lg whitespace-nowrap">
                          {h.fechaNacimiento ? `${calculateAge(h.fechaNacimiento)} años` : '—'}
                        </td>
                        <td className="py-md px-lg whitespace-nowrap">
                          {h.calle || 'Sin Calle'} — <strong>Casa {h.numeroCasa || 'S/N'}</strong>
                        </td>
                        <td className="py-md px-lg whitespace-nowrap">
                          {h.jefeFamilia ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/10 text-tertiary border border-tertiary/20">
                              Jefe de Familia
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container/60 text-on-surface-variant border border-outline-variant/10">
                              Miembro
                            </span>
                          )}
                        </td>
                        <td className="py-md px-lg max-w-[150px] truncate">
                          {h.discapacitado ? (
                            <span
                              className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error/10 text-error border border-error/20"
                              title={`Discapacidad: ${h.discapacitado}`}
                            >
                              <Icon name="accessible" size="14px" />
                              {h.discapacitado}
                            </span>
                          ) : (
                            <span className="text-outline italic text-xs">Ninguna</span>
                          )}
                        </td>
                        {(isAdmin || isLiderCalle) && (
                          <td className="py-md px-lg text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-xs">
                              <button
                                onClick={() => navigate(`/habitantes/${h._id}/editar`)}
                                className="p-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-all cursor-pointer active:scale-95"
                                title="Editar Habitante"
                              >
                                <Icon name="edit" size="18px" />
                              </button>
                              <button
                                onClick={() => handleDelete(h)}
                                className="p-1.5 rounded-lg border border-error/20 text-error hover:bg-error/5 transition-all cursor-pointer active:scale-95"
                                title="Eliminar Habitante"
                              >
                                <Icon name="delete" size="18px" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPagesListado}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
