import Icon from './Icon';

/**
 * Componente de alternancia de vista segmentada (Segmented Control).
 *
 * @param {object} props
 * @param {Array<{value: string, label: string, icon: string}>} props.options - Opciones del selector
 * @param {string} props.value - Valor seleccionado actual
 * @param {function(string): void} props.onChange - Callback al cambiar de opción
 */
export default function ViewToggle({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 shadow-sm">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              flex items-center gap-xs px-md py-1.5 rounded-lg text-body-sm font-semibold transition-all duration-300 cursor-pointer
              ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-outline-variant/15 hover:text-primary'
              }
            `}
          >
            {opt.icon && <Icon name={opt.icon} size="18px" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
