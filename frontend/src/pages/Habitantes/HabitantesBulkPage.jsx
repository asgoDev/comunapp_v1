import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useBulkCreateHabitantes } from '../../hooks/useHabitanteQueries';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import toast from 'react-hot-toast';

// ──────────────────────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────────────────────
const CAMPOS_REQUERIDOS = ['numeroCasa', 'nombres', 'apellidos', 'comunidad', 'calle'];
const CAMPOS_TABLA_PREVIEW = ['#', 'nombres', 'apellidos', 'cedula', 'fechaNacimiento', 'numeroCasa', 'calle', 'jefeFamilia'];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function validarEstructuraLocal(arr) {
  const problemas = [];
  arr.forEach((item, i) => {
    const faltantes = CAMPOS_REQUERIDOS.filter((c) => !item[c]);
    if (faltantes.length > 0) {
      problemas.push(`Fila ${i + 1}: Faltan campos obligatorios: ${faltantes.join(', ')}`);
    }
  });
  return problemas;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, colorClass }) {
  return (
    <div className={`flex items-center gap-md p-md rounded-xl border ${colorClass}`}>
      <div className="p-sm rounded-xl bg-current/10 shrink-0">
        <Icon name={icon} size="28px" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

// TablaPreview and TablaErrores components
function TablaPreview({ habitantes }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant/20">
            {CAMPOS_TABLA_PREVIEW.map((col) => (
              <th key={col} className="text-left px-4 py-3 text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                {col === '#' ? '#' : col.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {habitantes.map((h, i) => (
            <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
              <td className="px-4 py-2.5 text-on-surface-variant font-mono text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-on-surface">{h.nombres}</td>
              <td className="px-4 py-2.5 text-on-surface">{h.apellidos}</td>
              <td className="px-4 py-2.5 text-on-surface-variant font-mono text-xs">{h.cedula || '—'}</td>
              <td className="px-4 py-2.5 text-on-surface-variant">{h.fechaNacimiento || '—'}</td>
              <td className="px-4 py-2.5 text-on-surface">{h.numeroCasa}</td>
              <td className="px-4 py-2.5 text-on-surface">{h.calle}</td>
              <td className="px-4 py-2.5">
                {h.jefeFamilia
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><Icon name="star" size="12px" />Sí</span>
                  : <span className="text-outline text-xs">No</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaErrores({ errores }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-error/20">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-error/5 border-b border-error/20">
            <th className="text-left px-4 py-3 text-label-sm font-semibold text-error uppercase tracking-wider">Fila</th>
            <th className="text-left px-4 py-3 text-label-sm font-semibold text-error uppercase tracking-wider">Habitante</th>
            <th className="text-left px-4 py-3 text-label-sm font-semibold text-error uppercase tracking-wider">Motivo del Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-error/10">
          {errores.map((e, i) => (
            <tr key={i} className="hover:bg-error/5 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-error font-bold">{e.fila}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-on-surface">{e.habitante.nombres} {e.habitante.apellidos}</p>
                <p className="text-xs text-on-surface-variant">{e.habitante.cedula || 'Sin cédula'} · Casa {e.habitante.numeroCasa} · {e.habitante.calle}</p>
              </td>
              <td className="px-4 py-3 text-error text-xs">{e.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────────────────────
export default function HabitantesBulkPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { mutateAsync: bulkCreateHabitantes, isPending: isLoading } = useBulkCreateHabitantes();

  const fileInputRef = useRef(null);

  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState(null);
  const [preview, setPreview] = useState(null);          // array validado localmente
  const [validacionProblemas, setValidacionProblemas] = useState([]);
  const [resultado, setResultado] = useState(null);      // respuesta del backend

  // Guard: solo admin
  if (!currentUser || currentUser.role !== 'admin') {
    toast.error('Solo el administrador puede acceder a la carga masiva.');
    return <Navigate to="/habitantes" replace />;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Solo se admiten archivos .json');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target.result);
      setParseError(null);
      setPreview(null);
      setResultado(null);
      setValidacionProblemas([]);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleValidar = () => {
    setParseError(null);
    setPreview(null);
    setResultado(null);
    setValidacionProblemas([]);

    if (!jsonText.trim()) {
      setParseError('El contenido está vacío. Pega un JSON o carga un archivo.');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError('El texto no es un JSON válido. Revisa la sintaxis (comillas, comas, corchetes).');
      return;
    }

    if (!Array.isArray(parsed)) {
      setParseError('El JSON debe ser un array de objetos [ { ... }, { ... } ].');
      return;
    }

    if (parsed.length === 0) {
      setParseError('El array está vacío. Debe contener al menos un habitante.');
      return;
    }

    if (parsed.length > 500) {
      setParseError(`El lote supera el límite de 500 habitantes (recibidos: ${parsed.length}).`);
      return;
    }

    const problemas = validarEstructuraLocal(parsed);
    setValidacionProblemas(problemas);
    setPreview(parsed);

    if (problemas.length === 0) {
      toast.success(`✅ ${parsed.length} registros listos para cargar.`);
    } else {
      toast.error(`⚠️ Se encontraron ${problemas.length} problema(s) estructurales. Revisa antes de cargar.`);
    }
  };

  const handleCargar = async () => {
    if (!preview || preview.length === 0) return;

    try {
      const data = await bulkCreateHabitantes(preview);
      setResultado(data);

      if (data.fallidos === 0) {
        toast.success(`${data.creadosExitosamente} habitantes cargados exitosamente.`);
      } else {
        toast.error(`Carga parcial: ${data.creadosExitosamente} OK · ${data.fallidos} con errores.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al realizar la carga masiva.';
      toast.error(msg);
    }
  };

  const handleReset = () => {
    setJsonText('');
    setParseError(null);
    setPreview(null);
    setValidacionProblemas([]);
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const hayProblemasEstructurales = validacionProblemas.length > 0;
  const puedeCargar = preview && preview.length > 0 && !hayProblemasEstructurales && !resultado;

  return (
    <div className="space-y-lg animate-fade-in-up max-w-6xl mx-auto">

      {/* Volver */}
      <div className="flex items-center gap-xs text-on-surface-variant">
        <button
          type="button"
          onClick={() => navigate('/habitantes')}
          className="hover:text-primary flex items-center gap-xs font-label-lg text-label-lg transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size="18px" />
          <span>Volver a Habitantes</span>
        </button>
      </div>

      {/* Header */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary-container p-6 text-white">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-white/10 rounded-xl">
              <Icon name="upload_file" size="30px" />
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md font-bold">Carga Masiva de Habitantes</h2>
              <p className="text-body-sm text-white/80 mt-0.5">
                Importa hasta 500 habitantes en un solo lote desde un archivo JSON.
              </p>
            </div>
          </div>
        </div>

        <div className="p-lg space-y-lg">

          {/* ── Sección 1: Instrucciones ── */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-md space-y-sm">
            <div className="flex items-center gap-xs text-primary font-semibold">
              <Icon name="info" size="18px" />
              <span>Formato esperado del JSON</span>
            </div>
            <pre className="text-xs text-on-surface-variant bg-surface-container-low rounded-lg p-sm overflow-x-auto leading-relaxed">
{`[
  {
    "numeroCasa":      "14A",
    "nombres":         "Juan Carlos",
    "apellidos":       "Pérez Gómez",
    "cedula":          "V-12345678",   // opcional (null si no tiene)
    "fechaNacimiento": "1990-05-15",   // opcional, formato YYYY-MM-DD
    "jefeFamilia":     true,
    "discapacitado":   null,           // opcional
    "calle":           "Principal",
    "comunidad":       "6650abc123def456789012ab"  // ObjectId de la comunidad
  }
]`}
            </pre>
          </div>

          {/* ── Sección 2: Input de archivo + Textarea ── */}
          <div className="space-y-md">
            <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
              1. Carga el archivo o pega el JSON
            </p>

            {/* File input */}
            <div className="flex items-center gap-md">
              <label
                htmlFor="bulk-json-file"
                className="flex items-center gap-sm px-md py-sm rounded-lg border border-primary/40 bg-primary/5 text-primary text-label-lg font-semibold cursor-pointer hover:bg-primary/10 transition-all active:scale-95"
              >
                <Icon name="folder_open" size="20px" />
                Seleccionar archivo .json
              </label>
              <input
                id="bulk-json-file"
                type="file"
                accept=".json,application/json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {jsonText && (
                <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="check_circle" size="16px" className="text-tertiary" />
                  Contenido cargado
                </span>
              )}
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <label className="block text-label-lg font-label-lg text-on-surface-variant">
                O pega el JSON directamente aquí:
              </label>
              <textarea
                id="bulk-json-textarea"
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setParseError(null);
                  setPreview(null);
                  setResultado(null);
                  setValidacionProblemas([]);
                }}
                placeholder={'[\n  { "nombres": "Juan", "apellidos": "Pérez", ... }\n]'}
                rows={10}
                className={`
                  w-full bg-surface-container-low border rounded-xl
                  px-4 py-3 text-body-sm font-mono text-on-surface
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  transition-all resize-y min-h-[160px]
                  ${parseError ? 'border-error focus:ring-error/30' : 'border-outline-variant/40 hover:border-outline'}
                `}
              />
              {parseError && (
                <p className="text-label-sm text-error flex items-center gap-1 mt-1">
                  <Icon name="error" size="14px" />
                  {parseError}
                </p>
              )}
            </div>
          </div>

          {/* ── Sección 3: Botones de acción ── */}
          <div className="flex flex-wrap gap-md items-center">
            <Button
              id="btn-validar-json"
              type="button"
              variant="outline"
              onClick={handleValidar}
              disabled={!jsonText.trim() || isLoading}
              icon={<Icon name="fact_check" size="20px" />}
              className="active:scale-95 transition-all"
            >
              Validar JSON
            </Button>

            {puedeCargar && (
              <Button
                id="btn-cargar-masivo"
                type="button"
                loading={isLoading}
                onClick={handleCargar}
                icon={<Icon name="cloud_upload" size="20px" />}
                className="active:scale-95 transition-all"
              >
                Cargar {preview.length} Habitantes
              </Button>
            )}

            {(jsonText || preview || resultado) && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-xs text-on-surface-variant hover:text-error text-label-lg font-medium transition-colors cursor-pointer ml-auto"
              >
                <Icon name="delete_sweep" size="18px" />
                Limpiar todo
              </button>
            )}
          </div>

          {/* ── Sección 4: Problemas estructurales ── */}
          {hayProblemasEstructurales && (
            <div className="bg-error/5 border border-error/20 rounded-xl p-md space-y-sm">
              <div className="flex items-center gap-xs text-error font-semibold">
                <Icon name="warning" size="18px" />
                <span>Problemas estructurales detectados ({validacionProblemas.length})</span>
              </div>
              <ul className="space-y-1">
                {validacionProblemas.map((p, i) => (
                  <li key={i} className="text-xs text-error flex items-start gap-1">
                    <Icon name="close" size="14px" className="mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-on-surface-variant">
                Corrige estos problemas en el JSON antes de cargar.
              </p>
            </div>
          )}

          {/* ── Sección 5: Preview de tabla ── */}
          {preview && !resultado && (
            <div className="space-y-md">
              <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                2. Previsualización — {preview.length} registros
              </p>
              <TablaPreview habitantes={preview} />
              {!hayProblemasEstructurales && (
                <p className="text-body-sm text-tertiary flex items-center gap-1">
                  <Icon name="check_circle" size="16px" />
                  Estructura válida. Puedes proceder con la carga.
                </p>
              )}
            </div>
          )}

          {/* ── Sección 6: Resultado del backend ── */}
          {resultado && (
            <div className="space-y-md animate-fade-in-up">
              <p className="text-label-lg text-on-surface-variant font-semibold uppercase tracking-wider pb-xs border-b border-outline-variant/20">
                3. Resultado de la Carga
              </p>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                <StatCard
                  icon="receipt_long"
                  value={resultado.totalRecibidos}
                  label="Total Recibidos"
                  colorClass="bg-surface-container-low border-outline-variant/20 text-on-surface-variant"
                />
                <StatCard
                  icon="check_circle"
                  value={resultado.creadosExitosamente}
                  label="Creados Exitosamente"
                  colorClass="bg-tertiary/5 border-tertiary/20 text-tertiary"
                />
                <StatCard
                  icon="cancel"
                  value={resultado.fallidos}
                  label="Con Errores"
                  colorClass={resultado.fallidos > 0 ? 'bg-error/5 border-error/20 text-error' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'}
                />
              </div>

              {/* Tabla de errores */}
              {resultado.errores?.length > 0 && (
                <div className="space-y-sm">
                  <div className="flex items-center gap-xs text-error font-semibold">
                    <Icon name="error_outline" size="18px" />
                    <span>Detalle de Errores ({resultado.errores.length})</span>
                  </div>
                  <TablaErrores errores={resultado.errores} />
                </div>
              )}

              {resultado.fallidos === 0 && (
                <div className="flex items-center gap-sm p-md bg-tertiary/5 border border-tertiary/20 rounded-xl text-tertiary">
                  <Icon name="celebration" size="24px" />
                  <span className="font-semibold">¡Carga completada sin errores!</span>
                </div>
              )}

              <div className="flex gap-md pt-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  icon={<Icon name="refresh" size="18px" />}
                >
                  Nueva Carga
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate('/habitantes')}
                  icon={<Icon name="groups" size="18px" />}
                >
                  Ver Habitantes
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
