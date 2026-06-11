import User from '../models/User.js';
import { createUserSchema, updateUserSchema } from '../validations/user.js';

class UserService {
    /**
     * Obtiene todos los usuarios paginados y filtrados.
     */
    async getUsers({ page = 1, limit = 20, role, estado }) {
        const filter = {};

        if (role) filter.role = role;
        if (estado) filter.estado = estado;

        const users = await User.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 })
            .lean();

        const total = await User.countDocuments(filter);

        return {
            users,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Obtiene un usuario por ID.
     */
    async getUserById(id) {
        const user = await User.findById(id);
        if (!user) {
            throw new Error('Usuario no encontrado.');
        }
        return user;
    }

    /**
     * Crea un nuevo usuario.
     */
    async createUser(userData) {
        const data = createUserSchema.parse(userData);
        return await User.create(data);
    }

    /**
     * Actualiza un usuario existente.
     */
    async updateUser(id, userData) {
        const data = updateUserSchema.parse(userData);

        // Si se envía password, hay que dejar que el pre-save hook lo hashee
        if (data.password) {
            const user = await User.findById(id);
            if (!user) {
                throw new Error('Usuario no encontrado.');
            }
            Object.assign(user, data);
            await user.save();
            return user;
        }

        const user = await User.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            throw new Error('Usuario no encontrado.');
        }

        return user;
    }

    /**
     * Desactiva un usuario (soft delete).
     */
    async deleteUser(id, currentUserId) {
        if (id === currentUserId) {
            throw new Error('No puede desactivar su propia cuenta.');
        }

        const user = await User.findByIdAndUpdate(
            id,
            { estado: 'inactivo' },
            { new: true }
        );

        if (!user) {
            throw new Error('Usuario no encontrado.');
        }

        return user;
    }
}

export default new UserService();
