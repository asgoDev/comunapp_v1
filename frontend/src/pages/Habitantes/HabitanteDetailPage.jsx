import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHabitanteById, useDeleteHabitante } from '../../hooks/useHabitanteQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

export default function HabitanteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = useAuthStore((s) => s.user);
  const { data: habitante, isLoading, isError } = useHabitanteById(id);
  const { mutateAsync: deleteHabitante } = useDeleteHabitante();

  const isAdmin = currentUser?.role === 'admin';
  const isLiderCalle = currentUser?.role === 'LIDER_CALLE';
  const canEditOrDelete = isAdmin || isLiderCalle;

  useEffect(() => {
    if (isError) {
      toast.error('Error al cargar la información del habitante.');
      navigate('/habitantes');
    }
  }, [isError, navigate]);

  const handleDelete = async () => {
    if (!habitante) return;
    const fullName = `${habitante.nombres} ${habitante.apellidos}`;
    if (!window.confirm(`¿Está seguro de eliminar a ${fullName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteHabitante(habitante._id);
      toast.success('Habitante eliminado exitosamente.');
      navigate('/habitantes');
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

  if (isLoading || !habitante) {
    return (
      <div className="p-xl flex flex-col items-center justify-center space-y-md animate-fade-in-up">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-body-sm text-on-surface-variant font-medium">Cargando detalles del habitante...</p>
      </div>
    );
  }

  const fullName = `${habitante.nombres} ${habitante.apellidos}`;

  return (
    <div className="space-y-lg animate-fade-in-up max-w-4xl mx-auto">
      {/* Volver */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>Volver</span>
        </button>
      </div>

      {/* Card Principal */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        {/* Header con acciones */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-white/10 rounded-xl">
              <Icon name="person" size="32px" />
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md font-bold">{fullName}</h2>
              <p className="text-body-sm text-white/80 mt-0.5">
                Cédula: {habitante.cedula || 'No posee'}
              </p>
            </div>
          </div>

          {canEditOrDelete && (
            <div className="flex gap-sm self-stretch sm:self-auto justify-end">
              <Button
                onClick={() => navigate(`/habitantes/${habitante._id}/editar`)}
                variant="secondary"
                icon={<Icon name="edit" size="20px" />}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-semibold active:scale-95 transition-all"
              >
                Editar
              </Button>
              <Button
                onClick={handleDelete}
                variant="error"
                icon={<Icon name="delete" size="20px" />}
                className="font-semibold active:scale-95 transition-all"
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {/* Detalles en Grid */}
        <div className="p-lg space-y-lg">
          {/* Vivienda e Identidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Ubicación y Vivienda */}
            <div className="space-y-sm">
              <h3 className="text-label-lg text-primary font-bold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                Ubicación y Vivienda
              </h3>
              <div className="space-y-md">
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Comunidad</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.comunidad?.nombre || 'Comunidad no especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Calle</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.calle || 'Calle no especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Número de Casa</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    Casa N.º {habitante.numeroCasa || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Datos Personales */}
            <div className="space-y-sm">
              <h3 className="text-label-lg text-primary font-bold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                Datos Personales
              </h3>
              <div className="space-y-md">
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Nombres y Apellidos</p>
                  <p className="font-semibold text-body-md text-on-surface">{fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Fecha de Nacimiento</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.fechaNacimiento
                      ? `${new Date(habitante.fechaNacimiento).toLocaleDateString('es-VE')} (${calculateAge(habitante.fechaNacimiento)} años)`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Rol en el Hogar</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.jefeFamilia ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/10 text-tertiary border border-tertiary/20">
                        Jefe de Familia
                      </span>
                    ) : (
                      'Miembro del Hogar'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información Familiar/Salud y Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Salud / Discapacidad */}
            <div className="space-y-sm">
              <h3 className="text-label-lg text-primary font-bold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                Salud y Condiciones Especiales
              </h3>
              <div className="space-y-md">
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Discapacidad</p>
                  {habitante.discapacitado ? (
                    <p className="font-semibold text-body-md text-error flex items-center gap-1">
                      <Icon name="accessible" size="18px" />
                      {habitante.discapacitado}
                    </p>
                  ) : (
                    <p className="text-body-md text-on-surface-variant italic">Ninguna reportada</p>
                  )}
                </div>
              </div>
            </div>

            {/* Datos de Sistema */}
            <div className="space-y-sm">
              <h3 className="text-label-lg text-primary font-bold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                Información del Sistema
              </h3>
              <div className="space-y-md">
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Registrado Por</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.registradoPor
                      ? `${habitante.registradoPor.nombre || ''} ${habitante.registradoPor.apellido || ''}`.trim() || '—'
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Fecha de Registro</p>
                  <p className="font-semibold text-body-md text-on-surface">
                    {habitante.createdAt
                      ? new Date(habitante.createdAt).toLocaleString('es-VE')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium font-montserrat">Última Actualización</p>
                  <p className="font-semibold text-body-md text-on-surface font-montserrat">
                    {habitante.updatedAt
                      ? new Date(habitante.updatedAt).toLocaleString('es-VE')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
