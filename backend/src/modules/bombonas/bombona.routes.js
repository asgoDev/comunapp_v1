import { Router } from "express";
import AppError from "../../shared/errors/AppError.js";
import { authenticate, authorize } from "../../shared/middleware/auth.middleware.js";
import validate from "../../shared/middleware/validate.js";
import bombonaController from "./bombona.controller.js";
import {
  closeJornadaSchema,
  createJornadaSchema,
  idParamSchema,
  listJornadasQuerySchema,
  listPagosQuerySchema,
  reviewPagoSchema,
} from "./bombona.validation.js";

const router = Router();
router.use(authenticate);

// Auditoría: los datos de pago móvil y el texto libre de revisión pueden contener PII.
const redactJornadaAudit = (req, _res, next) => {
  req.auditBody = {
    comunidad: req.body?.comunidad,
    precios: req.body?.precios,
    pagoMovil: "[PROTEGIDO]",
  };
  next();
};

const redactReviewAudit = (req, _res, next) => {
  req.auditBody = { estado: req.body?.estado, motivoRechazo: "[PROTEGIDO]" };
  next();
};

const redactCloseAudit = (req, _res, next) => {
  req.auditBody = { motivo: "[PROTEGIDO]" };
  next();
};

router.use((req, _res, next) => {
  if (req.method === "POST" && req.path === "/jornadas") {
    return redactJornadaAudit(req, _res, next);
  }
  if (req.method === "PATCH" && /^\/pagos\/[^/]+\/revision$/.test(req.path)) {
    return redactReviewAudit(req, _res, next);
  }
  if (req.method === "PATCH" && /^\/jornadas\/[^/]+\/cerrar$/.test(req.path)) {
    return redactCloseAudit(req, _res, next);
  }
  next();
});
router.use(authorize("admin", "JEFE_COMUNIDAD"));
router.use((req, _res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !/^Bearer\s+\S+$/i.test(req.get("Authorization") || "")) {
    return next(new AppError("Las escrituras de Bombonas requieren access token Bearer.", 401, "BEARER_REQUIRED"));
  }
  next();
});

router.get(
  "/jornadas",
  validate(listJornadasQuerySchema, "query"),
  bombonaController.listJornadas,
);
router.post(
  "/jornadas",
  validate(createJornadaSchema),
  bombonaController.createJornada,
);
router.get(
  "/jornadas/:id",
  validate(idParamSchema, "params"),
  bombonaController.getJornada,
);
router.patch(
  "/jornadas/:id/cerrar",
  validate(idParamSchema, "params"),
  validate(closeJornadaSchema),
  bombonaController.closeJornada,
);

router.get(
  "/pagos",
  validate(listPagosQuerySchema, "query"),
  bombonaController.listPagos,
);
router.get(
  "/pagos/:id/comprobante",
  validate(idParamSchema, "params"),
  bombonaController.downloadComprobante,
);
router.get(
  "/pagos/:id",
  validate(idParamSchema, "params"),
  bombonaController.getPago,
);
router.patch(
  "/pagos/:id/revision",
  validate(idParamSchema, "params"),
  validate(reviewPagoSchema),
  bombonaController.reviewPago,
);

export default router;
