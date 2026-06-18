import { Router } from "express";
import comunidadController from "./comunidad.controller.js";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware.js";
import validate from "../../shared/middleware/validate.js";
import { createComunidadSchema, updateComunidadSchema } from "./comunidad.validation.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Rutas de lectura: ADMIN y JEFE_COMUNIDAD ──────────────────────────────────
router.get("/", authorize("admin", "JEFE_COMUNIDAD"), comunidadController.getComunidades);
router.get("/:id/resumen", authorize("admin", "JEFE_COMUNIDAD"), comunidadController.getComunidadResumen);
router.get("/:id", authorize("admin", "JEFE_COMUNIDAD"), comunidadController.getComunidad);

// ── Rutas de escritura: solo ADMIN ────────────────────────────────────────────
router.post("/", authorize("admin"), validate(createComunidadSchema), comunidadController.createComunidad);
router.put("/:id", authorize("admin"), validate(updateComunidadSchema), comunidadController.updateComunidad);
router.delete("/:id", authorize("admin"), comunidadController.deleteComunidad);

export default router;
