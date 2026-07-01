import Icon from './Icon';

/**
 * Componente de Paginación reutilizable.
 *
 * @param {object} props
 * @param {number} props.currentPage - Página actual
 * @param {number} props.totalPages - Total de páginas
 * @param {function(number): void} props.onPageChange - Callback al cambiar la página
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-md mt-md animate-fade-in">
      <div className="text-body-xs text-on-surface-variant">
        Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
      </div>
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-outline-variant/20 rounded-lg hover:bg-outline-variant/10 text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center active:scale-95"
          title="Página Anterior"
        >
          <Icon name="chevron_left" size="20px" />
        </button>
        <div className="px-md py-1.5 text-body-sm font-semibold border border-outline-variant/20 rounded-lg bg-surface-container-low min-w-[48px] text-center select-none">
          {currentPage}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-outline-variant/20 rounded-lg hover:bg-outline-variant/10 text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center active:scale-95"
          title="Página Siguiente"
        >
          <Icon name="chevron_right" size="20px" />
        </button>
      </div>
    </div>
  );
}
