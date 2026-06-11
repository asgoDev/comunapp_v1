import { forwardRef } from 'react';

const variants = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-container shadow-sm',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim',
  outline:
    'border border-outline-variant text-on-surface-variant hover:bg-outline-variant/10',
  ghost:
    'text-on-surface-variant hover:bg-outline-variant/10 hover:text-primary',
  danger:
    'bg-error text-on-error hover:bg-error/80',
};

const sizes = {
  sm: 'px-3 py-1.5 text-label-sm',
  md: 'px-md py-2 text-label-lg',
  lg: 'px-6 py-3 text-body-md',
};

/**
 * Botón reutilizable con variantes visuales.
 */
const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      className = '',
      disabled = false,
      loading = false,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-xs rounded-lg
          font-label-lg transition-all duration-200 cursor-pointer
          active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
