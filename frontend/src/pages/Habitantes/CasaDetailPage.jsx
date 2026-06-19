import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHabitantes, useDeleteHabitante } from '../../hooks/useHabitanteQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function CasaDetailPage() {
  const { numero } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentUser = useAuthStore((s) => s.user);

  const calle = searchParams.get('calle') || '';
  const isAdmin = currentUser?.role === 'admin';
  const isLiderCalle = currentUser?.role === 'LIDER_CALLE';
  const isJefeComunidad = currentUser?.role === 'JEFE_COMUNIDAD';

  const canEditOrDelete = isAdmin || isLiderCalle;

  const { data, isLoading, isError } = useHabitantes(1, { calle, limit: 250 });
  const habitantes = data?.habitantes || [];
  const { mutateAsync: deleteHabitante } = useDeleteHabitante();

  useEffect(() => {
    if (isError) {
      toast.error('Error al cargar la información de los habitantes.');
    }
  }, [isError]);

  // Filtrar localmente por número de casa
  const integrantes = habitantes.filter((h) => String(h.numeroCasa) === String(numero));

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

  const calculateAge = (dateString) => {
    if (!dateString) return '';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-lg animate-fade-in-up">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          onClick={() => navigate('/habitantes')}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>Volver a Habitantes</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-md">
          <div className="p-md bg-primary/10 rounded-xl text-primary">
            <Icon name="home" size="32px" />
          </div>
          <div>
            <h2 className="text-headline-md font-headline-md font-bold text-primary">Casa N.º {numero}</h2>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Calle: <strong className="text-on-surface">{calle}</strong>
            </p>
          </div>
        </div>

        {canEditOrDelete && (
          <Button
            onClick={() => navigate(`/habitantes/nuevo?casa=${numero}&calle=${encodeURIComponent(calle)}`)}
            icon={<Icon name="person_add" size="20px" />}
            className="shadow-sm active:scale-95 transition-all self-start md:self-auto"
          >
            Agregar a esta Casa
          </Button>
        )}
      </div>

      {/* Tabla de Integrantes */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
          <h3 className="font-bold text-label-lg text-on-surface uppercase tracking-wider">Miembros de la Vivienda</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            {integrantes.length} {integrantes.length === 1 ? 'Integrante' : 'Integrantes'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-md">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-body-sm text-on-surface-variant font-medium">Cargando integrantes...</p>
            </div>
          ) : integrantes.length === 0 ? (
            <div className="p-xl flex flex-col items-center justify-center space-y-sm text-center">
              <div className="w-16 h-16 rounded-full bg-outline-variant/10 text-outline flex items-center justify-center">
                <Icon name="groups" size="36px" />
              </div>
              <h3 className="text-label-lg font-bold text-on-surface">No hay habitantes registrados</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm">
                No hay habitantes en esta vivienda en este momento.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/20 text-on-surface-variant font-label-lg text-xs uppercase tracking-wider">
                  <th className="py-md px-lg">Nombre</th>
                  <th className="py-md px-lg">Cédula</th>
                  <th className="py-md px-lg">Edad</th>
                  <th className="py-md px-lg">Rol Familiar</th>
                  {canEditOrDelete && <th className="py-md px-lg text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-sm text-on-surface">
                {integrantes.map((h) => {
                  const fullName = `${h.nombres} ${h.apellidos}`;
                  return (
                    <tr
                      key={h._id}
                      onClick={() => navigate(`/habitantes/${h._id}`)}
                      className="hover:bg-primary-container/5 transition-colors cursor-pointer"
                    >
                      <td className="py-md px-lg font-bold text-primary">{fullName}</td>
                      <td className="py-md px-lg font-medium text-on-surface">{h.cedula || 'No posee'}</td>
                      <td className="py-md px-lg">
                        {h.fechaNacimiento
                          ? `${calculateAge(h.fechaNacimiento)} años`
                          : '—'}
                      </td>
                      <td className="py-md px-lg">
                        {h.jefeFamilia ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-tertiary/10 text-tertiary border border-tertiary/20">
                            Jefe de Familia
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-container/60 text-on-surface-variant border border-outline-variant/10">
                            Miembro
                          </span>
                        )}
                        {h.discapacitado && (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-error/10 text-error border border-error/20" title={`Discapacidad: ${h.discapacitado}`}>
                            <Icon name="accessible" size="14px" />
                            Discapacidad
                          </span>
                        )}
                      </td>
                      {canEditOrDelete && (
                        <td className="py-md px-lg text-right flex justify-end gap-xs" onClick={(e) => e.stopPropagation()}>
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
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
