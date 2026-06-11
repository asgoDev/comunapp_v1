/**
 * Manejador centralizado de errores.
 * Captura errores de Mongoose, Zod y errores genéricos.
 */
const errorHandler = (err, req, res, _next) => {
    console.error('❌ Error:', err.message);

    // ── Errores de validación de Zod ──
    if (err.name === 'ZodError') {
        const errors = err.errors.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
        }));
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }

    // ── Errores de validación de Mongoose ──
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            campo: e.path,
            mensaje: e.message,
        }));
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }

    // ── Error de duplicado (cédula o email único) ──
    if (err.code === 11000) {
        const campo = Object.keys(err.keyPattern).join(', ');
        return res.status(409).json({
            success: false,
            message: `El valor del campo '${campo}' ya existe en el sistema.`,
        });
    }

    // ── Error de Cast (ID inválido de Mongoose) ──
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `ID inválido: ${err.value}`
        });
    }

    // ── Error genérico ──
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Error interno del servidor',
    });
};

export default errorHandler;
