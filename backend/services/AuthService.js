import User from '../models/User.js';
import { loginSchema } from '../validations/auth.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt.utils.js';

class AuthService {
    /**
     * Autenticación de usuario con email/cédula y contraseña.
     */
    async login(loginData) {
        // Validar input con Zod
        const { identifier, password } = loginSchema.parse(loginData);

        // Determinar si es cédula o email
        const isCedula = /^[VE]-\d{6,9}$/i.test(identifier);
        const query = isCedula
            ? { cedula: identifier.toUpperCase() }
            : { email: identifier.toLowerCase() };

        // Buscar usuario (incluir password explícitamente)
        const user = await User.findOne(query).select('+password');

        if (!user) {
            throw new Error('Credenciales inválidas.');
        }

        // Verificar que el usuario esté activo
        if (user.estado === 'inactivo') {
            const err = new Error('Su cuenta está desactivada. Contacte al administrador.');
            err.userId = user._id;
            throw err;
        }

        // Comparar password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            const err = new Error('Credenciales inválidas.');
            err.userId = user._id;
            throw err;
        }

        // Payload del token (incluye role)
        const tokenPayload = {
            id: user._id,
            role: user.role,
        };

        // Generar tokens
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
            throw new Error('No se proporcionó refresh token.');
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (error) {
            throw new Error('Refresh token inválido o expirado.');
        }

        // Verificar que el usuario aún exista y esté activo
        const user = await User.findById(decoded.id);
        if (!user || user.estado === 'inactivo') {
            throw new Error('Usuario no encontrado o desactivado.');
        }

        // Generar nuevo access token y refresh token
        const tokenPayload = { id: user._id, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Obtiene el usuario autenticado actual.
     */
    async getMe(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado.');
        }
        return user;
    }
}

export default new AuthService();
