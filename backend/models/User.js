import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: [true, 'El nombre es requerido'],
            trim: true,
            maxlength: 50,
        },
        apellido: {
            type: String,
            required: [true, 'El apellido es requerido'],
            trim: true,
            maxlength: 50,
        },
        cedula: {
            type: String,
            required: [true, 'La cédula es requerida'],
            unique: true,
            trim: true,
            match: [/^[VE]-\d{6,9}$/, 'Formato de cédula inválido (V-12345678 o E-12345678)'],
        },
        email: {
            type: String,
            required: [true, 'El email es requerido'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, 'La contraseña es requerida'],
            minlength: 6,
            select: false, // No incluir en queries por defecto
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            required: [true, 'El rol es requerido'],
        },
        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo',
        },
        telefono: {
            type: String,
            trim: true,
            default: '',
        },
        direccion: {
            type: String,
            trim: true,
            default: '',
        },
        cargo: {
            type: String,
            trim: true,
            default: 'Usuario',
        },
        fechaNacimiento: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ── Hash del password antes de guardar ──
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// ── Método para comparar passwords ──
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Removemos password del JSON de respuesta ──
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
