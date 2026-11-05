import AppError from '../errors/AppError.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Manejador centralizado de errores.
 *
 * Orden de evaluación:
 *  1. AppError          — errores operacionales lanzados intencionalmente
 *  2. ZodError          — fallo de validación (si llega aquí sin pasar por validate())
 *  3. Mongoose errors   — ValidationError, CastError, código 11000
 *  4. Fallback 500      — cualquier error no controlado; oculta detalles en producción
 */
const errorHandler = (err, req, res, _next) => {
    // No registrar body, query, URL completa ni mensajes del error: pueden contener PII.
    const routePath = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.path;
    console.error(`❌ [${req.method}] ${routePath}`, {
        name: err.name,
        code: err.code,
        statusCode: err.statusCode,
    });

    // ── 1. Errores operacionales propios (AppError) ──────────────────────────
    if (err instanceof AppError) {
        const body = {
            success: false,
            message: err.message,
        };
        if (err.code) body.code = err.code;
        return res.status(err.statusCode).json(body);
    }

    // ── 2. ZodError ──────────────────────────────────────────────────────────
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: err.errors.map((e) => ({
                campo: e.path.join('.'),
                mensaje: e.message,
            })),
        });
    }

    // ── 3. Mongoose: validación de schema ────────────────────────────────────
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: Object.values(err.errors).map((e) => ({
                campo: e.path,
                mensaje: e.message,
            })),
        });
    }

    // ── 3. Mongoose: duplicado de clave única ────────────────────────────────
    if (err.code === 11000) {
        const campo = Object.keys(err.keyPattern ?? {}).join(', ');
        return res.status(409).json({
            success: false,
            message: `El valor del campo '${campo}' ya existe en el sistema.`,
        });
    }

    // ── 3. Mongoose: CastError (ObjectId inválido) ───────────────────────────
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `ID inválido: ${err.value}`,
        });
    }

    // ── body-parser: JSON malformado ─────────────────────────────────────────────
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'El cuerpo de la petición contiene JSON inválido.',
        });
    }

    // ── 4. Fallback — error no controlado ────────────────────────────────────
    // En producción nunca exponer el mensaje interno al cliente.
    return res.status(500).json({
        success: false,
        message: IS_PRODUCTION
            ? 'Error interno del servidor'
            : err.message || 'Error interno del servidor',
    });
};

export default errorHandler;
