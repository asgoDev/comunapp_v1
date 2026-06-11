import mongoose from 'mongoose';

const auditoriaSchema = new mongoose.Schema(
    {
        usuario_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        accion: {
            type: String,
            enum: ['CREAR', 'ACTUALIZAR', 'ELIMINAR'],
            required: true,
        },
        modulo: {
            type: String,
            required: true,
            trim: true,
        },
        detalles: {
            type: mongoose.Schema.Types.Mixed, // JSON libre: { anterior: {...}, nuevo: {...} }
            default: {},
        },
        fecha: {
            type: Date,
            default: Date.now,
        },
    },
    {
        versionKey: false,
    }
);

// ── Índice para consultas de auditoría ──
auditoriaSchema.index({ usuario_id: 1, fecha: -1 });
auditoriaSchema.index({ modulo: 1, fecha: -1 });

const Auditoria = mongoose.model('Auditoria', auditoriaSchema);
export default Auditoria;
