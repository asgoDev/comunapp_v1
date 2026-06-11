import { Router } from 'express';
import authController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/security.middleware.js';

const router = Router();

router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
