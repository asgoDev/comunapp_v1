import User from '../users/user.model.js';
import AppError from '../../shared/errors/AppError.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../../infrastructure/jwt/jwt.utils.js';

const PUBLIC_USER_FIELDS = 'id nombre apellido email role';

class AuthService {
    /**
     * Autenticación de usuario con email/cédula y contraseña.
     *
     * req.body ya viene validado por el middleware validate(loginSchema),
     * por lo que no se necesita .parse() aquí.
     *
     * SEGURIDAD — timing-safe:
     * comparePassword siempre se ejecuta aunque el usuario no exista,
     * para evitar user enumeration por diferencia de tiempo de respuesta.
     */
    async login({ identifier, password }) {
        const isCedula = /^[VE]-\d{6,9}$/i.test(identifier);
        const query = isCedula
            ? { cedula: identifier.toUpperCase() }
            : { email: identifier.toLowerCase() };

        const user = await User.findOne(query).select('+password');

        // Ejecutar siempre una comparación para igualar el tiempo de respuesta
        const DUMMY_HASH = '$2b$12$eImiTXuWVxfM37uY4JANjQe5ds4vAMpN8BUDKPqO4yrIbmUxKKiJy';
        const isMatch = user
            ? await user.comparePassword(password)
            : await import('bcrypt').then(({ default: bcrypt }) =>
                bcrypt.compare(password, DUMMY_HASH)
            );

        if (user?.estado === 'inactivo') {
            const err = new AppError(
                'Su cuenta está desactivada. Contacte al administrador.',
                403,
                'ACCOUNT_DISABLED'
            );
            err.userId = user._id; // para auditoría
            throw err;
        }

        if (!user || !isMatch) {
            throw new AppError('Credenciales inválidas.', 401, 'INVALID_CREDENTIALS');
        }

        const tokenPayload = { id: user._id, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            user: {
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Renueva el AccessToken usando el RefreshToken.
     */
    async refresh(token) {
        if (!token) {
            throw new AppError('No se proporcionó refresh token.', 401, 'MISSING_REFRESH_TOKEN');
        }

        const { createHash } = await import('crypto');
        const { default: TokenBlacklist } = await import('./auth.model.js');
        const hash = createHash('sha256').update(token).digest('hex');
        const isBlacklisted = await TokenBlacklist.exists({ tokenHash: hash });
        
        if (isBlacklisted) {
            throw new AppError('El token de sesión ha sido revocado.', 401, 'REVOKED_REFRESH_TOKEN');
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (cause) {
            const err = new AppError('Refresh token inválido o expirado.', 401, 'INVALID_REFRESH_TOKEN');
            err.cause = cause;
            throw err;
        }

        const user = await User.findById(decoded.id);
        if (!user || user.estado === 'inactivo') {
            throw new AppError('Usuario no encontrado o desactivado.', 401, 'USER_UNAVAILABLE');
        }

        const tokenPayload = { id: user._id, role: user.role };
        return {
            accessToken: generateAccessToken(tokenPayload),
            refreshToken: generateRefreshToken(tokenPayload),
        };
    }

    /**
     * Obtiene el usuario autenticado actual.
     * Solo proyecta campos públicos para no exponer datos internos.
     */
    async getMe(userId) {
        const user = await User.findById(userId).select(PUBLIC_USER_FIELDS);
        if (!user) {
            throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
        }
        return user;
    }

    /**
     * Invalida un refresh token añadiéndolo a la blacklist.
     * Requiere el modelo TokenBlacklist con TTL index.
     */
    async invalidateRefreshToken(token) {
        const { createHash } = await import('crypto');
        const { default: TokenBlacklist } = await import('./auth.model.js');
        const hash = createHash('sha256').update(token).digest('hex');
        try {
            await TokenBlacklist.create({ tokenHash: hash });
        } catch (error) {
            if (error.code !== 11000) {
                throw error;
            }
        }
    }
}

export default new AuthService();
