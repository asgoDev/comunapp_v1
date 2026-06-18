import { Router } from "express";
import habitanteController from "./habitante.controller.js";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware.js";
import validate from "../../shared/middleware/validate.js";
import {
  createHabitanteSchema,
  updateHabitanteSchema,
} from "./habitante.validation.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Lectura: ADMIN, JEFE_COMUNIDAD y LIDER_CALLE (filtros aplicados en el servicio) ──
router.get(
  "/",
  authorize("admin", "JEFE_COMUNIDAD", "LIDER_CALLE"),
  habitanteController.getHabitantes,
);
router.get(
  "/:id",
  authorize("admin", "JEFE_COMUNIDAD", "LIDER_CALLE"),
  habitanteController.getHabitante,
);

// ── Creación: ADMIN y LIDER_CALLE ──────────────────────────────────────────────
router.post(
  "/",
  authorize("admin", "LIDER_CALLE"),
  validate(createHabitanteSchema),
  habitanteController.createHabitante,
);

// ── Actualización: ADMIN y LIDER_CALLE ───────────────────────────────────────
router.put(
  "/:id",
  authorize("admin", "LIDER_CALLE"),
  validate(updateHabitanteSchema),
  habitanteController.updateHabitante,
);

// ── Eliminación: ADMIN y LIDER_CALLE (jurisdicción verificada en el servicio) ─
router.delete(
  "/:id",
  authorize("admin", "LIDER_CALLE"),
  habitanteController.deleteHabitante,
);

export default router;
