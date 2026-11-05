import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import AppError from "../../shared/errors/AppError.js";
import validate from "../../shared/middleware/validate.js";
import bombonaController from "./bombona.controller.js";
import { comunidadParamSchema, createPublicPaymentSchema } from "./bombona.validation.js";
import { enforceMultipartContentLength, parseComprobante } from "./bombona.upload.js";

const router = Router();

const limitResponse = (_req, res) =>
  res.status(429).json({
    success: false,
    message: "Demasiadas solicitudes. Intente nuevamente más tarde.",
    code: "RATE_LIMITED",
  });

const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitResponse,
});

const publicPaymentIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitResponse,
});

// Límite agregado por comunidad y origen, además del límite estricto por IP.
const publicPaymentCommunityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => `${req.params.comunidadId}:${ipKeyGenerator(req.ip)}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitResponse,
});

const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store, private");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
};

const validateIdempotencyKey = (req, _res, next) => {
  const key = req.get("Idempotency-Key");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    return next(new AppError("Envíe una clave Idempotency-Key UUID v4.", 400, "IDEMPOTENCY_KEY_REQUIRED"));
  }
  req.idempotencyKey = key.toLowerCase();
  next();
};

router.get(
  "/comunidades/:comunidadId/jornada-activa",
  noStore,
  publicReadLimiter,
  validate(comunidadParamSchema, "params"),
  bombonaController.getPublicJornada,
);

router.post(
  "/comunidades/:comunidadId/pagos",
  noStore,
  publicPaymentIpLimiter,
  validate(comunidadParamSchema, "params"),
  publicPaymentCommunityLimiter,
  validateIdempotencyKey,
  enforceMultipartContentLength,
  parseComprobante,
  validate(createPublicPaymentSchema),
  bombonaController.createPublicPayment,
);

export default router;
