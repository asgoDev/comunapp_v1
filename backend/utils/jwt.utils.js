import jwt from 'jsonwebtoken';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '8h';

/**
 * Genera un Access Token (corta duración)
 */
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRES,
    });
};

/**
 * Genera un Refresh Token (larga duración)
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRES,
    });
};

/**
 * Verifica un Access Token
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verifica un Refresh Token
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Configura las cookies httpOnly con los tokens
 */
export const setTokenCookies = (res, accessToken, refreshToken) => {
    // Forzamos true si estamos en Render (usualmente detecta la URL de render o añade la variable)
    // Una forma infalible es verificar si existe la variable de Render o si NODE_ENV es production
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // 'none' es vital si tu front está en otro dominio (ej. Vercel)
        maxAge: 15 * 60 * 1000,
        path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // 'none' para compatibilidad multi-dominio
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
    });

    res.cookie('sessionExpiry', (Date.now() + 8 * 60 * 60 * 1000).toString(), {
        httpOnly: false, // Permitir acceso desde JS en el frontend
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
    });
};

export const clearTokenCookies = (res) => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
    res.clearCookie('sessionExpiry', {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
};
