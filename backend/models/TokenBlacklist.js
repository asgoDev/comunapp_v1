/**
 * TokenBlacklist.js — modelo sugerido para invalidar refresh tokens.
 *
 * Se almacena el hash SHA-256 del token (nunca el token en texto plano)
 * y un TTL igual a la expiración máxima del refresh token, para que
 * MongoDB limpie automáticamente los registros expirados.
 *
 * Añadir en AuthService.invalidateRefreshToken():
 *
 *   import crypto from 'crypto';
 *   import TokenBlacklist from '../models/TokenBlacklist.js';
 *
 *   async invalidateRefreshToken(token) {
 *       const hash = crypto.createHash('sha256').update(token).digest('hex');
 *       await TokenBlacklist.create({ tokenHash: hash });
 *   }
 *
 * Y en AuthService.refresh(), antes de emitir nuevos tokens:
 *
 *   const hash = crypto.createHash('sha256').update(token).digest('hex');
 *   const revoked = await TokenBlacklist.exists({ tokenHash: hash });
 *   if (revoked) throw new Error('Refresh token inválido o expirado.');
 */

import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // TTL: MongoDB elimina el documento automáticamente después de 8 h (28800 s)
        // Ajustar según JWT_REFRESH_EXPIRES si se cambia en el entorno.
        expires: 28800,
    },
});

export default mongoose.model('TokenBlacklist', tokenBlacklistSchema);
