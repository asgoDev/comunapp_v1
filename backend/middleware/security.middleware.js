import rateLimit from 'express-rate-limit';

/**
 * Limitador general para todas las peticiones de la API.
 * Evita abuso general y escaneo de vulnerabilidades.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Límite de 200 peticiones por IP
    message: {
        message: 'Demasiadas peticiones desde esta IP. Por favor intente de nuevo más tarde.',
    },
    standardHeaders: true, // Devuelve información del límite en las cabeceras `RateLimit-*`
    legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*` antiguas
});

/**
 * Limitador estricto para rutas de autenticación (Login).
 * Protege contra ataques de fuerza bruta.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Límite de 10 intentos de inicio de sesión por IP
    message: {
        message: 'Demasiados intentos de inicio de sesión. Por favor intente de nuevo en 15 minutos.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
