import authService from './auth.service.js';
import { setTokenCookies, clearTokenCookies } from '../../infrastructure/jwt/jwt.utils.js';

/**
 * El controlador ya no compara strings de error.
 * AuthService lanza AppError con statusCode — el errorHandler lo captura directamente.
 * El controlador solo gestiona el flujo feliz y propaga errores con next(error).
 */
class AuthController {
    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);

            req.auditUserId = result.user.id;
            setTokenCookies(res, result.accessToken, result.refreshToken);

            res.json({
                message: 'Inicio de sesión exitoso',
                user: result.user,
                accessToken: result.accessToken,
            });
        } catch (error) {
            if (error.userId) req.auditUserId = error.userId;
            next(error); // AppError llega al errorHandler con su statusCode
        }
    }

    /**
     * POST /api/auth/refresh
     */
    async refresh(req, res, next) {
        try {
            // El refresh solo se acepta por cookie HttpOnly. Ignorar el body
            // impide reabrir un canal donde JavaScript pueda leer o enviar el token.
            const token = req.cookies?.refreshToken;
            const result = await authService.refresh(token);

            setTokenCookies(res, result.accessToken, result.refreshToken);

            res.json({
                message: 'Token renovado exitosamente',
                accessToken: result.accessToken,
            });
        } catch (error) {
            clearTokenCookies(res);
            next(error);
        }
    }

    /**
     * POST /api/auth/logout
     */
    async logout(req, res, next) {
        try {
            const token = req.cookies?.refreshToken;
            if (token) await authService.invalidateRefreshToken(token);
        } catch (error) {
            // No bloquear el logout si falla la invalidación; loguear y continuar
            console.error('Error al invalidar refresh token:', error);
        } finally {
            clearTokenCookies(res);
            res.json({ message: 'Sesión cerrada exitosamente' });
        }
    }

    /**
     * GET /api/auth/me
     */
    async getMe(req, res, next) {
        try {
            const user = await authService.getMe(req.user.id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
