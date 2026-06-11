import { verifyAccessToken } from '../utils/jwt.utils.js';

/**
 * Middleware de autenticación.
 * Verifica el accessToken de:
 *   1. Header Authorization: Bearer <token>  (prioridad, compatible con iOS/ITP)
 *   2. Cookie httpOnly accessToken            (fallback, escritorio)
 */
export const authenticate = (req, res, next) => {
    // 1. Intentar extraer del header Authorization
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && /^bearer /i.test(authHeader)) {
        token = authHeader.split(' ')[1];
    }

    // 2. Fallback a cookie
    if (!token) {
        token = req.cookies?.accessToken;
    }

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded; // { id, role, iat, exp }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

/**
 * Middleware de autorización por roles.
 * Recibe un array de roles permitidos y verifica que el rol del usuario esté en la lista.
 *
 * @example
 *  router.get('/admin', authenticate, authorize('admin'), controller);
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'No tiene permisos para realizar esta acción.',
            });
        }
        next();
    };
};
