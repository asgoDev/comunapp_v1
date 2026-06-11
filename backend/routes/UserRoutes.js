import { Router } from 'express';
import userController from '../controllers/UserController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticate);

router.get('/', authorize('admin'), userController.getUsers);
router.get('/:id', authorize('admin'), userController.getUserById);
router.post('/', authorize('admin'), userController.createUser);
router.put('/:id', authorize('admin'), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

export default router;
