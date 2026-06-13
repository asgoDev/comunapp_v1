import jwt from 'jsonwebtoken';

// Leer tiempos de expiración desde el entorno para permitir ajuste sin tocar el código.
// Si no están definidos, se usan valores razonables por defecto.
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '8h';

export const generateAccessToken = (payload) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });

export const generateRefreshToken = (payload) =>
    jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

export const verifyAccessToken = (token) =>
    jwt.verify(token, process.env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);

/**
 * Calcula el tiempo de expiración en milisegundos a partir de un string como '15m' o '8h'.
 * Usado para fijar el maxAge de las cookies con la misma fuente de verdad que los tokens.
 */
const parseMs = (str) => {
    const unit = str.slice(-1);
    const value = parseInt(str, 10);
    const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return (units[unit] ?? 60_000) * value;
};

export const setTokenCookies = (res, accessToken, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const cookieBase = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    };

    res.cookie('accessToken', accessToken, {
        ...cookieBase,
        maxAge: parseMs(ACCESS_EXPIRES),
    });

    res.cookie('refreshToken', refreshToken, {
        ...cookieBase,
        maxAge: parseMs(REFRESH_EXPIRES),
    });

    // Cookie legible desde JS para que el frontend sepa cuándo expira la sesión
    res.cookie('sessionExpiry', (Date.now() + parseMs(REFRESH_EXPIRES)).toString(), {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: parseMs(REFRESH_EXPIRES),
        path: '/',
    });
};

export const clearTokenCookies = (res) => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const clearOpts = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    };

    res.clearCookie('accessToken',   { ...clearOpts });
    res.clearCookie('refreshToken',  { ...clearOpts });
    res.clearCookie('sessionExpiry', { ...clearOpts, httpOnly: false });
};
