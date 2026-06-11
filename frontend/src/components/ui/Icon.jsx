/**
 * Wrapper para Material Symbols Outlined.
 * @param {object} props
 * @param {string} props.name - Nombre del ícono de Material Symbols
 * @param {boolean} [props.filled] - Si el ícono debe ser relleno
 * @param {string} [props.size] - Tamaño CSS del ícono (ej: '18px', '32px')
 * @param {string} [props.className] - Clases adicionales
 */
export default function Icon({ name, filled = false, size, className = '' }) {
  const style = size ? { fontSize: size } : undefined;

  return (
    <span
      className={`material-symbols-outlined ${filled ? 'fill-icon' : ''} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
}
