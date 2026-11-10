import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { useAuthStore } from '../../stores/authStore';
import { useComunidadesDropdown } from '../../hooks/useComunidadQueries';
import { useCalles, useJornadaActiva, usePagos } from '../../hooks/useBombonaAdminQueries';
import { buildPagosQueryParams, ESTADOS_FILTRO } from '../../utils/bombonaAdmin';
import CerrarJornadaModal from './components/CerrarJornadaModal';
import CrearJornadaModal from './components/CrearJornadaModal';
import JornadaActivaCard from './components/JornadaActivaCard';
import PagoDetalleModal from './components/PagoDetalleModal';
import PagosTable from './components/PagosTable';

const InfoCard = ({ icon, title, message, action, tone = 'primary' }) => {
  const toneClasses = tone === 'error'
    ? 'bg-error/10 text-error'
    : 'bg-primary/10 text-primary';

  return (
    <section className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-lg text-center shadow-sm sm:p-8">
      <div className={`mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon name={icon} size="30px" />
      </div>
      <h3 className="text-headline-sm font-bold text-on-surface">{title}</h3>
      <p className="mx-auto mt-sm max-w-lg text-body-md text-on-surface-variant">{message}</p>
      {action && <div className="mt-lg flex justify-center">{action}</div>}
    </section>
  );
};

export default function JornadasBombonasPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const comunidadUsuario = user?.comunidad?._id || user?.comunidad || '';

  const [comunidadId, setComunidadId] = useState(isAdmin ? '' : comunidadUsuario);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [calleFiltro, setCalleFiltro] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [pagoSeleccionadoId, setPagoSeleccionadoId] = useState(null);

  useEffect(() => {
    if (!isAdmin) setComunidadId(comunidadUsuario);
  }, [comunidadUsuario, isAdmin]);

  useEffect(() => {
    if (!search) {
      setSearchDebounced('');
      return undefined;
    }
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [estadoFiltro, calleFiltro, searchDebounced]);

  const { data: comunidades = [] } = useComunidadesDropdown({ enabled: isAdmin });
  const {
    data: jornada,
    isLoading: isLoadingJornada,
    isError: isErrorJornada,
    refetch: refetchJornada,
  } = useJornadaActiva(comunidadId || null);

  useEffect(() => {
    setCalleFiltro('');
    setEstadoFiltro('');
    setSearch('');
    setSearchDebounced('');
    setPage(1);
  }, [jornada?._id]);

  const { data: calles = [] } = useCalles(jornada?._id);

  const filters = useMemo(
    () => buildPagosQueryParams({
      jornadaId: jornada?._id,
      estado: estadoFiltro,
      calle: calleFiltro,
      search: searchDebounced,
      page,
      limit: 20,
    }),
    [calleFiltro, estadoFiltro, jornada?._id, page, searchDebounced],
  );

  const {
    data: pagosData,
    isLoading: isLoadingPagos,
    isError: isErrorPagos,
    refetch: refetchPagos,
  } = usePagos(filters);

  const comunidadSeleccionada = useMemo(
    () => comunidades.find((comunidad) => comunidad._id === comunidadId),
    [comunidadId, comunidades],
  );
  const comunidadNombre = jornada?.comunidad?.nombre
    || comunidadSeleccionada?.nombre
    || (typeof user?.comunidad === 'object' ? user?.comunidad?.nombre : '')
    || '';

  const pagination = pagosData?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };
  const pagos = pagosData?.pagos || [];

  const handleComunidadChange = (event) => {
    setComunidadId(event.target.value);
    setCalleFiltro('');
    setEstadoFiltro('');
    setSearch('');
    setSearchDebounced('');
    setPage(1);
  };

  const copiarEnlace = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace público copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const renderContenido = () => {
    if (!comunidadId) {
      return (
        <InfoCard
          icon="home_work"
          title="Seleccione una comunidad"
          message={
            isAdmin
              ? 'Seleccione una comunidad para gestionar sus jornadas.'
              : 'Su usuario no tiene una comunidad asignada. Contacte al administrador.'
          }
        />
      );
    }

    if (isLoadingJornada) {
      return (
        <div className="animate-pulse space-y-md rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-lg shadow-sm">
          <div className="h-7 w-1/3 rounded-lg bg-surface-container" />
          <div className="h-4 w-2/3 rounded-lg bg-surface-container" />
          <div className="h-40 rounded-lg bg-surface-container" />
        </div>
      );
    }

    if (isErrorJornada) {
      return (
        <InfoCard
          icon="cloud_off"
          tone="error"
          title="No se pudo cargar la jornada"
          message="Revise su conexión e intente nuevamente."
          action={(
            <Button
              type="button"
              variant="outline"
              onClick={() => refetchJornada()}
              icon={<Icon name="refresh" size="18px" />}
            >
              Reintentar
            </Button>
          )}
        />
      );
    }

    if (!jornada) {
      return (
        <InfoCard
          icon="event_busy"
          title="No hay jornada activa"
          message={`No hay jornada activa para ${comunidadNombre || 'esta comunidad'}. Cree una para comenzar a recibir pagos.`}
          action={(
            <Button
              type="button"
              onClick={() => setModalCrear(true)}
              icon={<Icon name="add" size="18px" />}
            >
              Crear jornada
            </Button>
          )}
        />
      );
    }

    return (
      <>
        <JornadaActivaCard
          jornada={jornada}
          comunidadNombre={comunidadNombre}
          onCerrar={() => setModalCerrar(true)}
          onCopiarEnlace={copiarEnlace}
        />

        <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-md shadow-sm">
          <div className="grid grid-cols-1 gap-md md:grid-cols-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="toggle_on" size="20px" />
              </span>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                aria-label="Filtrar pagos por estado"
                className="w-full appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low py-2 pl-10 pr-4 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {ESTADOS_FILTRO.map((estado) => (
                  <option key={estado.value} value={estado.value}>{estado.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="arrow_drop_down" />
              </span>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="signpost" size="20px" />
              </span>
              <select
                value={calleFiltro}
                onChange={(event) => setCalleFiltro(event.target.value)}
                aria-label="Filtrar pagos por calle"
                className="w-full appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low py-2 pl-10 pr-4 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las calles</option>
                {calles.map((calle) => (
                  <option key={calle} value={calle}>{calle}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="arrow_drop_down" />
              </span>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="search" size="20px" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por referencia, código o propietario..."
                aria-label="Buscar pagos"
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low py-2 pl-10 pr-4 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        {isErrorPagos ? (
          <InfoCard
            icon="cloud_off"
            tone="error"
            title="No se pudieron cargar los pagos"
            message="Revise su conexión e intente nuevamente."
            action={(
              <Button
                type="button"
                variant="outline"
                onClick={() => refetchPagos()}
                icon={<Icon name="refresh" size="18px" />}
              >
                Reintentar
              </Button>
            )}
          />
        ) : (
          <PagosTable
            pagos={pagos}
            isLoading={isLoadingPagos}
            isError={isErrorPagos}
            onVerDetalle={setPagoSeleccionadoId}
            pagination={pagination}
            onPageChange={setPage}
            isEmpty={!isLoadingPagos && pagos.length === 0}
          />
        )}
      </>
    );
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      <div className="flex flex-col justify-between gap-md md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
            <Icon name="event_note" size="16px" />
            <span>Jornadas</span>
            <Icon name="chevron_right" size="14px" />
            <span>Bombonas</span>
          </div>
          <h2 className="text-headline-lg font-headline-lg text-primary">Jornadas de Bombonas</h2>
          <p className="text-body-sm text-on-surface-variant">
            Gestión de jornadas, pagos y comprobantes por comunidad.
          </p>
        </div>

        {comunidadId && (
          <Button
            type="button"
            onClick={() => setModalCrear(true)}
            disabled={Boolean(jornada) || isLoadingJornada}
            title={jornada ? 'Ya existe una jornada activa para esta comunidad' : undefined}
            icon={<Icon name="add" size="20px" />}
            className="self-start md:self-auto"
          >
            Crear jornada
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-md shadow-sm">
        {isAdmin ? (
          <div className="max-w-md space-y-1">
            <label htmlFor="comunidad-jornada" className="block text-label-lg text-on-surface-variant">
              Comunidad
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="location_city" size="20px" />
              </span>
              <select
                id="comunidad-jornada"
                value={comunidadId}
                onChange={handleComunidadChange}
                className="w-full appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low py-2 pl-10 pr-10 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleccione una comunidad...</option>
                {comunidades.map((comunidad) => (
                  <option key={comunidad._id} value={comunidad._id}>{comunidad.nombre}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline">
                <Icon name="arrow_drop_down" />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="location_city" size="22px" />
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Mi Comunidad</p>
              <p className="text-label-lg font-bold text-on-surface">
                {comunidadNombre || 'Comunidad asignada'}
              </p>
            </div>
          </div>
        )}
      </section>

      {renderContenido()}

      <CrearJornadaModal
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        comunidadId={comunidadId}
        comunidadNombre={comunidadNombre}
        rol={user?.role}
        onCreated={() => refetchJornada()}
      />

      <CerrarJornadaModal
        isOpen={modalCerrar}
        onClose={() => setModalCerrar(false)}
        jornada={jornada}
        onClosed={() => refetchJornada()}
      />

      <PagoDetalleModal
        isOpen={Boolean(pagoSeleccionadoId)}
        onClose={() => setPagoSeleccionadoId(null)}
        pagoId={pagoSeleccionadoId}
        comunidadNombre={comunidadNombre}
        onRevisionExitosa={() => refetchPagos()}
      />
    </div>
  );
}
