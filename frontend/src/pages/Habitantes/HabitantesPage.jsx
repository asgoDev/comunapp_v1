import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHabitanteStore } from '../../stores/habitanteStore';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

const CALLES_FIJAS = ['Principal', 'Calle 1', 'Calle 2', 'Calle 3', 'Calle 4'];

export default function HabitantesPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const { habitantes, isLoading, fetchHabitantes } = useHabitanteStore();

  const isLiderCalle = currentUser?.role === 'LIDER_CALLE';
  const isAdmin = currentUser?.role === 'admin';
  const userCalle = currentUser?.calle || '';

  const [selectedCalle, setSelectedCalle] = useState(isLiderCalle ? userCalle : '');
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar habitantes al cambiar selectedCalle o al montar
  useEffect(() => {
    if (isLiderCalle && !userCalle) return;

    const filters = {};
    if (selectedCalle) {
      filters.calle = selectedCalle;
    }
    fetchHabitantes(1, { ...filters, limit: 250 }).catch((err) => {
      console.error(err);
      toast.error('Error al cargar la lista de habitantes.');
    });
  }, [fetchHabitantes, selectedCalle, isLiderCalle, userCalle]);

  // Filtrar habitantes localmente por búsqueda
  const filteredHabitantes = habitantes.filter((h) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const fullName = `${h.nombres} ${h.apellidos}`.toLowerCase();
    const cedula = (h.cedula || '').toLowerCase();
    const numeroCasa = (h.numeroCasa || '').toLowerCase();

    return fullName.includes(term) || cedula.includes(term) || numeroCasa.includes(term);
  });

  const uniqueCalles = Array.from(
    new Set([
      ...CALLES_FIJAS,
      ...habitantes.map((h) => h.calle).filter(Boolean)
    ])
  ).sort();

  // Agrupar por calle y casa para evitar duplicados en calles diferentes
  const casas = Object.entries(
    filteredHabitantes.reduce((acc, h) => {
      const key = `${h.calle || 'Sin Calle'}|||${h.numeroCasa || 'Sin Número'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(h);
      return acc;
    }, {})
  ).sort(([a], [b]) => {
    const [, aNum] = a.split('|||');
    const [, bNum] = b.split('|||');
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  const handleCreateNew = () => {
    // Redirige a /habitantes/nuevo
    // Si viene de una calle/casa, podemos prellenarlo
    const queryParams = new URLSearchParams();
    if (selectedCalle) {
      queryParams.append('calle', selectedCalle);
    }
    navigate(`/habitantes/nuevo?${queryParams.toString()}`);
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary">Casas y Habitantes</h2>
          <p className="text-body-sm text-on-surface-variant">
            {isLiderCalle
              ? `Calle asignada: ${userCalle} — Comunidad: ${currentUser?.comunidad?.nombre || 'Mi Comunidad'}`
              : `Comunidad: ${currentUser?.comunidad?.nombre || 'Todas las Comunidades'}`}
          </p>
        </div>

        {(isLiderCalle || isAdmin) && (
          <Button
            onClick={handleCreateNew}
            icon={<Icon name="person_add" size="20px" />}
            className="shadow-sm active:scale-95 transition-all self-start md:self-auto"
          >
            Registrar Habitante
          </Button>
        )}
      </div>

      {/* Tarjeta de Filtros y Búsqueda */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/10 shadow-sm space-y-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Selector de Calle */}
          {isLiderCalle ? (
            <div className="flex items-center gap-sm bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2 text-body-sm font-medium text-on-surface">
              <Icon name="signpost" className="text-primary" />
              <span>Calle asignada: <strong>{userCalle}</strong></span>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                <Icon name="signpost" size="20px" />
              </span>
              <select
                value={selectedCalle}
                onChange={(e) => setSelectedCalle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-10 py-2.5 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="">{isLiderCalle ? 'Seleccione una calle...' : 'Todas las calles'}</option>
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
 
          {/* Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              <Icon name="search" size="20px" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, cédula o casa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLiderCalle && !selectedCalle}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2.5 text-body-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Grid de Casas */}
      {(isLiderCalle && !selectedCalle) ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm text-center">
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
          <p className="text-body-sm text-on-surface-variant font-medium">Cargando casas y habitantes...</p>
        </div>
      ) : casas.length === 0 ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-outline-variant/10 text-outline flex items-center justify-center mb-sm">
            <Icon name="home_work" size="36px" />
          </div>
          <h3 className="text-label-lg font-bold text-on-surface">No se encontraron casas</h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
            No hay habitantes registrados en la calle seleccionada que coincidan con la búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
          {casas.map(([compoundKey, integrantes]) => {
            const [calleName, casaNum] = compoundKey.split('|||');
            const count = integrantes.length;
            const jefe = integrantes.find((h) => h.jefeFamilia);
            return (
              <div
                key={compoundKey}
                onClick={() => navigate(`/habitantes/casa/${casaNum}?calle=${encodeURIComponent(calleName)}`)}
                className="bg-surface-container-lowest hover:bg-primary-container/5 rounded-xl border border-outline-variant/20 hover:border-primary/30 p-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group"
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
                      <p className="font-semibold text-primary">{jefe.nombres} {jefe.apellidos}</p>
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
      )}
    </div>
  );
}
