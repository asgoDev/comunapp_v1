import { forwardRef, useState } from 'react';
import Icon from './Icon';

/**
 * Input reutilizable con label flotante, ícono y estado de error.
 */
const Input = forwardRef(
  (
    {
      label,
      icon,
      type = 'text',
      error,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label className="block text-label-lg font-label-lg text-on-surface-variant">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              <Icon name={icon} size="20px" />
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full bg-surface-container-low border rounded-lg
              px-4 py-3 text-body-md text-on-surface
              placeholder:text-outline font-montserrat
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              transition-all duration-200
              ${icon ? 'pl-10' : ''}
              ${isPassword ? 'pr-10' : ''}
              ${error
                ? 'border-error focus:ring-error/30 focus:border-error'
                : 'border-outline-variant/40 hover:border-outline'
              }
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
              tabIndex={-1}
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="20px" />
            </button>
          )}
        </div>
        {error && (
          <p className="text-label-sm text-error flex items-center gap-1 mt-1">
            <Icon name="error" size="14px" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
