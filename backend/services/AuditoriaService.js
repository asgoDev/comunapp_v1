import Auditoria from '../models/Auditoria.js';

class AuditoriaService {
    /**
     * Registra una acción en la base de datos de auditoría.
     */
    async create(auditData) {
        return await Auditoria.create(auditData);
    }
}

export default new AuditoriaService();
