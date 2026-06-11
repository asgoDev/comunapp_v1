import authService from '../services/AuthService.js';
import { setTokenCookies, clearTokenCookies } from '../utils/jwt.utils.js';

class AuthController {
    /**
     * POST /api/auth/login
     * Autenticación de usuario con email/cédula y contraseña.
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);

            // Inyectar userId para que el middleware de auditoría lo registre
            req.auditUserId = result.user.id;

            // Enviar tokens en cookies httpOnly (compatibilidad)
            setTokenCookies(res, result.accessToken, result.refreshToken);

            // Devolver tokens en el body para que el frontend pueda usar Authorization header
            // Esto resuelve el bloqueo de cookies de terceros en iOS (ITP)
            res.json({
                message: 'Inicio de sesión exitoso',
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        } catch (error) {
            if (error.userId) {
                req.auditUserId = error.userId;
            }
            if (error.message === 'Credenciales inválidas.') {
                return res.status(401).json({ message: error.message });
            }
            if (error.message === 'Su cuenta está desactivada. Contacte al administrador.') {
                return res.status(403).json({ message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/auth/refresh
     * Renueva el AccessToken usando el RefreshToken.
     */
    async refresh(req, res, next) {
        try {
            // Aceptar refreshToken de la cookie O del body (para iOS / sin cookies)
            const token = req.cookies?.refreshToken || req.body?.refreshToken;
            const result = await authService.refresh(token);

            setTokenCookies(res, result.accessToken, result.refreshToken);

            // Devolver tokens en el body
            res.json({
                message: 'Token renovado exitosamente',
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        } catch (error) {
            clearTokenCookies(res);
            res.status(401).json({ message: error.message });
        }
    }

    /**
     * POST /api/auth/logout
     * Cierra la sesión eliminando las cookies de autenticación.
     */
    async logout(_req, res) {
        clearTokenCookies(res);
        res.json({ message: 'Sesión cerrada exitosamente' });
    }

    /**
     * GET /api/auth/me
     * Retorna los datos del usuario autenticado.
     */
    async getMe(req, res, next) {
        try {
            const user = await authService.getMe(req.user.id);
            res.json(user);
        } catch (error) {
            if (error.message === 'Usuario no encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            next(error);
        }
    }
}

export default new AuthController();
