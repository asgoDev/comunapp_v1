import { Router } from "express";
import profileController from "./profile.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import validate from "../../shared/middleware/validate.js";
import { updateProfileSchema, changePasswordSchema } from "./profile.validation.js";

const router = Router();

// Todas las rutas del perfil requieren autenticación
router.use(authenticate);

router.get("/", profileController.getProfile);
router.put("/", validate(updateProfileSchema), profileController.updateProfile);
router.put("/password", validate(changePasswordSchema), profileController.changePassword);

export default router;
