import User from '../models/User.js';
import Auditoria from '../models/Auditoria.js';

class DashboardService {
    /**
     * Estadísticas básicas para la pantalla de bienvenida.
     */
    async getStats() {
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
}

export default new DashboardService();
