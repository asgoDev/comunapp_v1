/**
 * AppError
 *
 * Error operacional con statusCode y código semántico opcional.
 * Cualquier error lanzado intencionalmente en la app debe ser instancia de esta clase.
 * El errorHandler distingue entre errores operacionales (isOperational: true)
 * y fallos inesperados de infraestructura (5xx) usando esa propiedad.
 */
class AppError extends Error {
    /**
     * @param {string} message    Mensaje para el cliente
     * @param {number} statusCode Código HTTP (400, 401, 403, 404, 409…)
     * @param {string} [code]     Código semántico opcional, ej: 'INVALID_CREDENTIALS'
     */
    constructor(message, statusCode, code) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code ?? null;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
