import bombonaService from "./bombona.service.js";
import { validateComprobanteSignature } from "./bombona.upload.js";

class BombonaController {
  async createJornada(req, res, next) {
    try {
      const jornada = await bombonaService.createJornada(req.body, req.user.id);
      res.status(201).json({ message: "Jornada de bombonas creada exitosamente.", jornada });
    } catch (error) {
      next(error);
    }
  }

  async listJornadas(req, res, next) {
    try {
      res.json(await bombonaService.listJornadas(req.validatedQuery, req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async getJornada(req, res, next) {
    try {
      res.json(await bombonaService.getJornada(req.validatedParams.id, req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async closeJornada(req, res, next) {
    try {
      const jornada = await bombonaService.closeJornada(req.validatedParams.id, req.body, req.user.id);
      res.json({ message: "Jornada cerrada exitosamente.", jornada });
    } catch (error) {
      next(error);
    }
  }

  async getPublicJornada(req, res, next) {
    try {
      res.set("Cache-Control", "no-store, private");
      res.set("X-Robots-Tag", "noindex, nofollow");
      res.json(await bombonaService.getPublicJornada(req.validatedParams.comunidadId));
    } catch (error) {
      next(error);
    }
  }

  async createPublicPayment(req, res, next) {
    try {
      const comprobante = validateComprobanteSignature(req.file);
      const result = await bombonaService.createPublicPayment(
        req.validatedParams.comunidadId,
        req.body,
        req.idempotencyKey,
        comprobante,
      );
      res
        .status(result.replay ? 200 : 201)
        .set("Cache-Control", "no-store, private")
        .json({
          message: result.replay ? "Pago previamente registrado." : "Pago registrado exitosamente.",
          pago: result.pago,
        });
    } catch (error) {
      next(error);
    }
  }

  async listPagos(req, res, next) {
    try {
      res.json(await bombonaService.listPagos(req.validatedQuery, req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async getPago(req, res, next) {
    try {
      res.json(await bombonaService.getPagoDetail(req.validatedParams.id, req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async reviewPago(req, res, next) {
    try {
      const pago = await bombonaService.reviewPago(req.validatedParams.id, req.body, req.user.id);
      res.json({ message: "Revisión del pago registrada.", pago });
    } catch (error) {
      next(error);
    }
  }

  async downloadComprobante(req, res, next) {
    try {
      const comprobante = await bombonaService.getComprobante(req.validatedParams.id, req.user.id);
      res
        .set("Cache-Control", "private, no-store")
        .set("Referrer-Policy", "no-referrer")
        .json({ url: comprobante.url, expiraEn: comprobante.expiresAt });
    } catch (error) {
      next(error);
    }
  }
}

export default new BombonaController();
