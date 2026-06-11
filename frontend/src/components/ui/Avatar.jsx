/**
 * Avatar con iniciales como fallback.
 */
export default function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`${sizes[size]} rounded-full border-2 border-secondary shadow-sm object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary-container text-on-primary-container 
        flex items-center justify-center font-bold ${className}`}
    >
      {initials || '?'}
    </div>
  );
}
