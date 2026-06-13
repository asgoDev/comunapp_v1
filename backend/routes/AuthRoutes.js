import { Router } from 'express';
import authController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/security.middleware.js';
import validate from '../middleware/validate.js';
import { loginSchema } from '../validations/auth.js';

const router = Router();

// validate(loginSchema) valida req.body antes de llegar al controlador.
// Si falla, lanza ZodError directamente al errorHandler — el servicio nunca lo ve.
router.post('/login',   authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout',  authController.logout);
router.get('/me',       authenticate, authController.getMe);

export default router;
