import User from '../users/user.model.js';
import Auditoria from '../auditoria/auditoria.model.js';

import mongoose from 'mongoose';

class DashboardService {
    /**
     * Estadísticas básicas para la pantalla de bienvenida.
     */
    async getStats(requester) {
        if (!requester || requester.role === 'admin') {
            const [usersCount, activeUsersCount, auditCount] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ estado: 'activo' }),
                Auditoria.countDocuments(),
            ]);

            return {
                usersCount,
                activeUsersCount,
                auditCount,
            };
        }

        const dbUser = await User.findById(requester.id).select('comunidad calle').lean();
        if (!dbUser) {
            return {
                usersCount: 0,
                activeUsersCount: 0,
                auditCount: 0,
            };
        }

        if (requester.role === 'JEFE_COMUNIDAD') {
            const [lideresCount, activeLideresCount, habitantesCount] = await Promise.all([
                User.countDocuments({ role: 'LIDER_CALLE', comunidad: dbUser.comunidad }),
                User.countDocuments({ role: 'LIDER_CALLE', comunidad: dbUser.comunidad, estado: 'activo' }),
                mongoose.model('Habitante').countDocuments({ comunidad: dbUser.comunidad }),
            ]);

            return {
                usersCount: lideresCount,
                activeUsersCount: activeLideresCount,
                auditCount: habitantesCount,
            };
        }

        if (requester.role === 'LIDER_CALLE') {
            const [habitantesCount, housesResult, jefesCount] = await Promise.all([
                mongoose.model('Habitante').countDocuments({ comunidad: dbUser.comunidad, calle: dbUser.calle }),
                mongoose.model('Habitante').distinct('numeroCasa', { comunidad: dbUser.comunidad, calle: dbUser.calle }),
                mongoose.model('Habitante').countDocuments({ comunidad: dbUser.comunidad, calle: dbUser.calle, jefeFamilia: true }),
            ]);

            return {
                usersCount: habitantesCount,
                activeUsersCount: housesResult.length,
                auditCount: jefesCount,
            };
        }

        return {
            usersCount: 0,
            activeUsersCount: 0,
            auditCount: 0,
        };
    }
}

export default new DashboardService();
