import userService from '../services/UserService.js';

class UserController {
    /**
     * GET /api/users
     * Obtiene todos los usuarios.
     */
    async getUsers(req, res, next) {
        try {
            const result = await userService.getUsers(req.query);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/users/:id
     * Obtiene un usuario por ID.
     */
    async getUserById(req, res, next) {
        try {
            const user = await userService.getUserById(req.params.id);
            res.json(user);
        } catch (error) {
            if (error.message === 'Usuario no encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/users
     * Crea un nuevo usuario.
     */
    async createUser(req, res, next) {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json({ message: 'Usuario creado exitosamente', user });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/users/:id
     * Actualiza un usuario existente.
     */
    async updateUser(req, res, next) {
        try {
            const user = await userService.updateUser(req.params.id, req.body);
            res.json({ message: 'Usuario actualizado exitosamente', user });
        } catch (error) {
            if (error.message === 'Usuario no encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/users/:id
     * Desactiva un usuario (soft delete).
     */
    async deleteUser(req, res, next) {
        try {
            const user = await userService.deleteUser(req.params.id, req.user.id);
            res.json({ message: 'Usuario desactivado exitosamente', user });
        } catch (error) {
            if (error.message === 'No puede desactivar su propia cuenta.') {
                return res.status(400).json({ message: error.message });
            }
            if (error.message === 'Usuario no encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            next(error);
        }
    }
}

export default new UserController();
