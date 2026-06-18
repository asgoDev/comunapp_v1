import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useComunidadStore } from '../../stores/comunidadStore';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function ComunidadResumenPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { fetchComunidadById, fetchComunidadResumen } = useComunidadStore();

  const [comunidad, setComunidad] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [comunidadData, resumenData] = await Promise.all([
          fetchComunidadById(id),
          fetchComunidadResumen(id)
        ]);

        if (active) {
          setComunidad(comunidadData);
          setResumen(resumenData);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar la información detallada de la comunidad.');
        navigate('/comunidades');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [id, fetchComunidadById, fetchComunidadResumen, navigate]);

  if (loading) {
    return (
      <div className="p-xl flex flex-col items-center justify-center space-y-md min-h-[50vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-body-sm text-on-surface-variant font-medium">Cargando resumen de la comunidad...</p>
      </div>
    );
  }

  if (!comunidad || !resumen) return null;

  const statCards = [
    {
      label: 'Habitantes',
      value: resumen.habitantes,
      icon: 'groups',
      colorClass: 'text-primary bg-primary/10 border-primary/20',
      description: 'Total de personas registradas',
    },
    {
      label: 'Jefes de Familia',
      value: resumen.jefesFamilia,
      icon: 'family_restroom',
      colorClass: 'text-secondary bg-secondary/10 border-secondary/20',
      description: 'Hogares en la comunidad',
    },
    {
      label: 'Jefes de Comunidad',
      value: resumen.jefesComunidad,
      icon: 'shield_person',
      colorClass: 'text-tertiary bg-tertiary-fixed-dim/20 border-tertiary/20',
      description: 'Representantes principales activos',
    },
    {
      label: 'Líderes de Calle',
      value: resumen.lideresCalle,
      icon: 'home_pin',
      colorClass: 'text-info bg-cyan-500/10 border-cyan-500/20',
      description: 'Coordinadores territoriales',
    },
  ];

  return (
    <div className="space-y-lg animate-fade-in-up max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-on-surface-variant">
        <button
          onClick={() => navigate('/comunidades')}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer group"
        >
          <Icon name="arrow_back" size="18px" className="group-hover:-translate-x-1 transition-transform" />
          <span>Volver a Comunidades</span>
        </button>

        {isAdmin && (
          <Button
            onClick={() => navigate(`/comunidades/${id}`)}
            variant="outline"
            size="sm"
            icon={<Icon name="edit" size="18px" />}
            className="shadow-sm active:scale-95 transition-all"
          >
            Editar Comunidad
          </Button>
        )}
      </div>

      {/* Tarjeta Principal de Presentación */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {/* Cabecera con degradado */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 md:p-8 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md relative z-10">
            <div className="flex items-center gap-md">
              <div className="p-md bg-white/10 rounded-xl backdrop-blur-sm shadow-inner">
                <Icon name="location_city" size="32px" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                  Resumen de Comunidad
                </span>
                <h1 className="text-headline-lg font-bold leading-tight mt-0.5">{comunidad.nombre}</h1>
                <p className="text-body-sm text-white/80 mt-1 flex items-center gap-xs">
                  <Icon name="pin_drop" size="16px" />
                  <span>{comunidad.ciudadPueblo} — Parroquia {comunidad.parroquia}</span>
                </p>
              </div>
            </div>

            {comunidad.circuitoComuna && (
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2.5 rounded-lg backdrop-blur-sm self-start md:self-auto border border-white/10">
                <Icon name="schema" size="20px" className="text-yellow-300" />
                <div>
                  <p className="text-[10px] text-white/70 uppercase font-semibold tracking-wider">Circuito / Comuna</p>
                  <p className="text-label-lg font-bold">{comunidad.circuitoComuna}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ficha Territorial */}
        <div className="p-lg border-b border-outline-variant/10 bg-surface-container-low">
          <h2 className="text-label-lg font-bold text-on-surface-variant uppercase tracking-wider mb-sm">
            Detalles Territoriales
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Estado</p>
              <p className="font-bold text-on-surface mt-0.5">{comunidad.estado}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Municipio</p>
              <p className="font-bold text-on-surface mt-0.5">{comunidad.municipio}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Parroquia</p>
              <p className="font-bold text-on-surface mt-0.5">{comunidad.parroquia}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Ciudad / Pueblo</p>
              <p className="font-bold text-on-surface mt-0.5">{comunidad.ciudadPueblo}</p>
            </div>
          </div>
        </div>

        {/* Cuadrícula de Estadísticas */}
        <div className="p-lg space-y-md">
          <h2 className="text-label-lg font-bold text-on-surface-variant uppercase tracking-wider">
            Estadísticas Generales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-surface-container-low p-lg rounded-xl shadow-sm border border-outline-variant/10 
                           flex flex-col justify-between group hover:shadow-md hover:border-primary/20 
                           transition-all duration-300 h-36 relative overflow-hidden"
              >
                {/* Micro-animación de fondo */}
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-125 transition-transform duration-500 text-on-surface">
                  <Icon name={card.icon} size="96px" />
                </div>

                <div className="flex justify-between items-start relative z-10">
                  <span className="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    {card.label}
                  </span>
                  <div className={`p-sm rounded-lg border transition-all duration-300 ${card.colorClass}`}>
                    <Icon name={card.icon} size="20px" />
                  </div>
                </div>

                <div className="relative z-10 mt-auto">
                  <h3 className="text-headline-lg font-bold text-on-surface leading-none">
                    {card.value}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie de Página */}
        <div className="bg-surface-container-low px-lg py-md border-t border-outline-variant/10 flex justify-end gap-md">
          <Button
            variant="outline"
            onClick={() => navigate('/comunidades')}
            className="active:scale-95 transition-all"
          >
            Cerrar Resumen
          </Button>
          {isAdmin && (
            <Button
              onClick={() => navigate(`/comunidades/${id}`)}
              icon={<Icon name="edit" size="20px" />}
              className="active:scale-95 transition-all px-lg"
            >
              Editar Comunidad
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
