import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * Modal reutilizable con cierre por Escape, bloqueo de scroll y manejo de foco.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  children,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);

      const previousFocus = previousFocusRef.current;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidth = size === 'lg' ? 'max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`max-h-[85vh] w-full ${maxWidth} overflow-y-auto rounded-xl bg-surface-container-lowest shadow-sm outline-none`}
      >
        <div className="flex items-center justify-between gap-md border-b border-outline-variant/15 p-lg">
          <div className="flex min-w-0 items-center gap-sm">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={icon} size="24px" />
              </div>
            )}
            <h2 id={titleId} className="truncate text-headline-sm font-bold text-on-surface">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-outline-variant/10 hover:text-on-surface"
          >
            <Icon name="close" size="22px" />
          </button>
        </div>

        <div className="p-lg">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
