import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Comunidad from "../comunidades/comunidad.model.js";
import Habitante from "../habitantes/habitante.model.js";
import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";
import JornadaBombona from "./jornadaBombona.model.js";
import PagoBombona from "./pagoBombona.model.js";
import cloudinaryService from "./cloudinary.service.js";

const toCentavos = (amount) => Math.round(amount * 100);
const toVES = (centavos) => Number((centavos / 100).toFixed(2));
const idOf = (value) => value?._id?.toString?.() ?? value?.toString?.() ?? null;
const normalizeText = (value) => value.trim().replace(/\s+/g, " ");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializePrices = (prices) => ({
  grande: toVES(prices.grande),
  mediana: toVES(prices.mediana),
  pequena: toVES(prices.pequena),
});

const serializeJornada = (jornada) => ({
  _id: jornada._id,
  comunidad: jornada.comunidad,
  creadaPor: jornada.creadaPor,
  precios: serializePrices(jornada.preciosCentavos),
  moneda: "VES",
  pagoMovil: jornada.pagoMovil,
  activa: jornada.activa,
  fechaCierre: jornada.fechaCierre,
  cerradaPor: jornada.cerradaPor,
  motivoCierre: jornada.motivoCierre,
  pagosRegistrados: jornada.pagosRegistrados,
  createdAt: jornada.createdAt,
  updatedAt: jornada.updatedAt,
});

const serializePayment = (payment) => ({
  _id: payment._id,
  jornada: payment.jornada,
  comunidad: payment.comunidad,
  codigoSeguimiento: payment.codigoSeguimiento,
  calle: payment.calle,
  numeroCasa: payment.numeroCasa,
  propietario: payment.propietario,
  referencia: payment.referencia,
  bombonas: payment.bombonas,
  precios: serializePrices(payment.preciosCentavos),
  total: toVES(payment.totalCentavos),
  moneda: "VES",
  estado: payment.estado,
  revisadoPor: payment.revisadoPor,
  fechaRevision: payment.fechaRevision,
  motivoRechazo: payment.motivoRechazo,
  comprobante: payment.comprobante
    ? {
        contentType: payment.comprobante.contentType,
        size: payment.comprobante.size,
        disponible: payment.comprobante.disponible,
        expiraEn: payment.comprobante.expiraEn,
        eliminadoEn: payment.comprobante.eliminadoEn,
      }
    : undefined,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const paymentHash = (communityId, jornadaId, data, fileHash) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        comunidad: communityId,
        jornada: jornadaId,
        calle: data.calle,
        numeroCasa: data.numeroCasa,
        propietario: normalizeText(data.propietario).toLocaleLowerCase("es-VE"),
        referencia: data.referencia,
        bombonasGrande: data.bombonasGrande,
        bombonasMediana: data.bombonasMediana,
        bombonasPequena: data.bombonasPequena,
        comprobante: fileHash,
      }),
    )
    .digest("hex");

const hashKey = (key) => createHash("sha256").update(key).digest("hex");

const isDuplicateKey = (error) => error?.code === 11000;

class BombonaService {
  async _getManager(userId) {
    const user = await User.findById(userId)
      .select("role comunidad estado")
      .lean();

    if (!user || user.estado === "inactivo") {
      throw new AppError("Usuario autenticado no encontrado o inactivo.", 401, "USER_NOT_FOUND");
    }
    if (!["admin", "JEFE_COMUNIDAD"].includes(user.role)) {
      throw new AppError("No tiene permisos para acceder al módulo de bombonas.", 403, "FORBIDDEN");
    }
    if (user.role === "JEFE_COMUNIDAD" && !user.comunidad) {
      throw new AppError("El usuario no tiene una comunidad asignada.", 403, "FORBIDDEN");
    }

    return user;
  }

  _assertCommunityScope(resource, manager) {
    if (manager.role === "admin") return;
    if (idOf(resource.comunidad) !== idOf(manager.comunidad)) {
      throw new AppError("No tiene permisos para acceder a este recurso.", 403, "FORBIDDEN");
    }
  }

  async _resolveManagerCommunity(data, manager) {
    let comunidadId;
    if (manager.role === "admin") {
      if (!data.comunidad) {
        throw new AppError("Debe seleccionar una comunidad.", 400, "COMUNIDAD_REQUIRED");
      }
      comunidadId = data.comunidad;
    } else {
      comunidadId = idOf(manager.comunidad);
      if (data.comunidad && data.comunidad !== comunidadId) {
        throw new AppError("No tiene permisos para crear una jornada en otra comunidad.", 403, "FORBIDDEN");
      }
    }

    const comunidad = await Comunidad.findOne({ _id: comunidadId, activo: true })
      .select("nombre")
      .lean();
    if (!comunidad) {
      throw new AppError("Comunidad no encontrada o inactiva.", 404, "COMUNIDAD_NOT_FOUND");
    }
    return comunidad;
  }

  async createJornada(data, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const comunidad = await this._resolveManagerCommunity(data, manager);

    const existing = await JornadaBombona.findOne({ comunidad: comunidad._id, activa: true }).lean();
    if (existing) {
      throw new AppError("Ya existe una jornada activa para esta comunidad.", 409, "JORNADA_ACTIVA_EXISTENTE");
    }

    try {
      const jornada = await JornadaBombona.create({
        comunidad: comunidad._id,
        creadaPor: manager._id,
        preciosCentavos: {
          grande: toCentavos(data.precios.grande),
          mediana: toCentavos(data.precios.mediana),
          pequena: toCentavos(data.precios.pequena),
        },
        pagoMovil: data.pagoMovil,
      });
      return serializeJornada(jornada.toObject());
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError("Ya existe una jornada activa para esta comunidad.", 409, "JORNADA_ACTIVA_EXISTENTE");
      }
      throw error;
    }
  }

  async listJornadas(query, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const filter = {};

    if (manager.role === "JEFE_COMUNIDAD") {
      if (query.comunidadId && query.comunidadId !== idOf(manager.comunidad)) {
        throw new AppError("No tiene permisos para consultar otra comunidad.", 403, "FORBIDDEN");
      }
      filter.comunidad = manager.comunidad;
    } else if (query.comunidadId) {
      filter.comunidad = query.comunidadId;
    }

    if (query.activa !== undefined) filter.activa = query.activa === "true";
    const skip = (query.page - 1) * query.limit;
    const [jornadas, total] = await Promise.all([
      JornadaBombona.find(filter)
        .populate("comunidad", "nombre")
        .populate("creadaPor", "nombre apellido")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      JornadaBombona.countDocuments(filter),
    ]);

    return {
      jornadas: jornadas.map(serializeJornada),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getJornada(id, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const jornada = await JornadaBombona.findById(id)
      .populate("comunidad", "nombre")
      .populate("creadaPor", "nombre apellido")
      .lean();
    if (!jornada) throw new AppError("Jornada no encontrada.", 404, "JORNADA_NOT_FOUND");
    this._assertCommunityScope(jornada, manager);
    return serializeJornada(jornada);
  }

  async closeJornada(id, data, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const jornada = await JornadaBombona.findById(id).lean();
    if (!jornada) throw new AppError("Jornada no encontrada.", 404, "JORNADA_NOT_FOUND");
    this._assertCommunityScope(jornada, manager);
    if (!jornada.activa) return serializeJornada(jornada);

    const closed = await JornadaBombona.findOneAndUpdate(
      {
        _id: id,
        activa: true,
        ...(manager.role === "JEFE_COMUNIDAD" ? { comunidad: manager.comunidad } : {}),
      },
      {
        $set: {
          activa: false,
          fechaCierre: new Date(),
          cerradaPor: manager._id,
          motivoCierre: data.motivo || null,
        },
      },
      { new: true },
    ).lean();
    if (closed) return serializeJornada(closed);

    const current = await JornadaBombona.findById(id).lean();
    if (!current) throw new AppError("Jornada no encontrada.", 404, "JORNADA_NOT_FOUND");
    this._assertCommunityScope(current, manager);
    if (!current.activa) return serializeJornada(current);
    throw new AppError("No se pudo cerrar la jornada. Intente nuevamente.", 409, "JORNADA_CAMBIO_CONCURRENTE");
  }

  async getPublicJornada(comunidadId) {
    const comunidad = await Comunidad.findOne({ _id: comunidadId, activo: true })
      .select("nombre")
      .lean();
    if (!comunidad) {
      throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
    }

    const jornada = await JornadaBombona.findOne({ comunidad: comunidad._id, activa: true })
      .select("preciosCentavos pagoMovil")
      .lean();
    if (!jornada) {
      throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
    }

    const viviendasRaw = await Habitante.aggregate([
      {
        $match: {
          comunidad: comunidad._id,
          calle: { $type: "string" },
          numeroCasa: { $regex: /^\d{1,8}$/ },
        },
      },
      {
        $project: {
          calle: { $trim: { input: "$calle" } },
          numeroCasa: 1,
        },
      },
      { $match: { calle: { $ne: "" } } },
      {
        $group: {
          _id: "$calle",
          casas: { $addToSet: "$numeroCasa" },
        },
      },
    ]);
    const viviendas = viviendasRaw
      .map((vivienda) => ({
        calle: vivienda._id,
        casas: [...new Set(vivienda.casas.map(String).filter((casa) => /^\d{1,8}$/.test(casa)))].sort(
          (left, right) => Number(left) - Number(right) || left.localeCompare(right),
        ),
      }))
      .filter((vivienda) => vivienda.casas.length > 0)
      .sort((left, right) => left.calle.localeCompare(right.calle, "es"));

    return {
      comunidad: { _id: comunidad._id, nombre: comunidad.nombre },
      jornada: {
        precios: serializePrices(jornada.preciosCentavos),
        moneda: "VES",
        pagoMovil: jornada.pagoMovil,
      },
      viviendas,
      limites: { maxPorTipo: 10, maxTotal: 20 },
    };
  }

  async createPublicPayment(comunidadId, data, idempotencyKey, comprobante) {
    const keyHash = hashKey(idempotencyKey);
    const normalizedData = {
      ...data,
      calle: data.calle.trim(),
      propietario: normalizeText(data.propietario),
    };
    const quantities = {
      grande: data.bombonasGrande,
      mediana: data.bombonasMediana,
      pequena: data.bombonasPequena,
    };

    const replayExisting = async (existing) => {
      const expectedHash = paymentHash(comunidadId, idOf(existing.jornada), normalizedData, comprobante.sha256);
      if (existing.requestHash !== expectedHash) {
        throw new AppError("La clave de idempotencia ya fue utilizada con otros datos.", 409, "PAGO_IDEMPOTENCIA_CONFLICTO");
      }
      return { pago: this._serializePublicResult(existing), replay: true };
    };

    const previous = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
      .select("+requestHash")
      .lean();
    if (previous) return replayExisting(previous);

    const retentionDays = Number(process.env.COMPROBANTE_RETENTION_DAYS || 60);
    if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      throw new AppError("COMPROBANTE_RETENTION_DAYS debe estar entre 1 y 3650.", 500, "INVALID_RETENTION_CONFIG");
    }

    const comunidadActiva = await Comunidad.findOne({ _id: comunidadId, activo: true })
      .select("_id")
      .lean();
    if (!comunidadActiva) {
      throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
    }

    const jornadaPrevia = await JornadaBombona.findOne({ comunidad: comunidadId, activa: true }).lean();
    if (!jornadaPrevia) {
      throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
    }

    const casaExiste = await Habitante.exists({
      comunidad: comunidadId,
      calle: normalizedData.calle,
      numeroCasa: data.numeroCasa,
    });
    if (!casaExiste) {
      throw new AppError("La combinación de calle y número de casa no pertenece a esta comunidad.", 400, "CASA_NO_ENCONTRADA");
    }

    const referenciaNormalizada = data.referencia.trim().toUpperCase();
    const referenciaExiste = await PagoBombona.exists({
      jornada: jornadaPrevia._id,
      referenciaNormalizada,
    });
    if (referenciaExiste) {
      throw new AppError("Esta referencia ya fue registrada para la jornada.", 409, "REFERENCIA_DUPLICADA");
    }

    // La subida remota ocurre fuera de la transacción MongoDB; si la BD aborta,
    // se elimina solo el recurso creado por este intento.
    const uploadedComprobante = await cloudinaryService.uploadComprobante(comprobante.buffer, {
      comunidadId,
      jornadaId: idOf(jornadaPrevia._id),
      format: comprobante.format,
    });
    const comprobanteMetadata = {
      ...uploadedComprobante,
      contentType: comprobante.contentType,
      sha256: comprobante.sha256,
      disponible: true,
      expiraEn: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
      eliminadoEn: null,
    };

    let session;
    try {
      session = await mongoose.startSession();
      const transactionResult = await session.withTransaction(async () => {
        const inTransaction = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
          .select("+requestHash")
          .session(session)
          .lean();
        if (inTransaction) {
          return { ...(await replayExisting(inTransaction)), cleanupUploadedAsset: true };
        }

        const comunidadActivaEnTransaccion = await Comunidad.findOne({ _id: comunidadId, activo: true })
          .select("_id")
          .session(session)
          .lean();
        if (!comunidadActivaEnTransaccion) {
          throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
        }

        const jornada = await JornadaBombona.findOne({ comunidad: comunidadId, activa: true })
          .session(session)
          .lean();
        if (!jornada) {
          throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
        }

        const casaExisteEnTransaccion = await Habitante.exists({
          comunidad: comunidadId,
          calle: normalizedData.calle,
          numeroCasa: data.numeroCasa,
        })
          .session(session);
        if (!casaExisteEnTransaccion) {
          throw new AppError("La combinación de calle y número de casa no pertenece a esta comunidad.", 400, "CASA_NO_ENCONTRADA");
        }

        const requestHash = paymentHash(comunidadId, idOf(jornada._id), normalizedData, comprobante.sha256);
        const referenciaExiste = await PagoBombona.exists({
          jornada: jornada._id,
          referenciaNormalizada,
        }).session(session);
        if (referenciaExiste) {
          throw new AppError("Esta referencia ya fue registrada para la jornada.", 409, "REFERENCIA_DUPLICADA");
        }

        // Escribe la jornada dentro de la misma transacción. El cierre concurrente
        // compite por el mismo documento y no puede aceptar un pago tras cerrarla.
        const jornadaAdmitiendo = await JornadaBombona.findOneAndUpdate(
          { _id: jornada._id, activa: true },
          { $inc: { pagosRegistrados: 1 } },
          { new: true, session },
        ).lean();
        if (!jornadaAdmitiendo) {
          throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
        }

        const preciosCentavos = jornadaAdmitiendo.preciosCentavos;
        const totalCentavos =
          quantities.grande * preciosCentavos.grande +
          quantities.mediana * preciosCentavos.mediana +
          quantities.pequena * preciosCentavos.pequena;
        if (!Number.isSafeInteger(totalCentavos) || totalCentavos < 1) {
          throw new AppError("El total calculado no es válido.", 400, "INVALID_PAYMENT_TOTAL");
        }

        const payment = new PagoBombona({
          jornada: jornadaAdmitiendo._id,
          comunidad: comunidadId,
          codigoSeguimiento: `PAGO-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`,
          calle: normalizedData.calle,
          numeroCasa: data.numeroCasa,
          propietario: normalizedData.propietario,
          referencia: referenciaNormalizada,
          referenciaNormalizada,
          bombonas: quantities,
          preciosCentavos,
          totalCentavos,
          idempotencyKeyHash: keyHash,
          requestHash,
          comprobante: comprobanteMetadata,
        });
        await payment.save({ session });

        return { pago: this._serializePublicResult(payment), replay: false };
      });

      if (transactionResult.cleanupUploadedAsset) {
        await this._cleanupUploadedComprobante(uploadedComprobante.publicId);
      }
      return transactionResult;
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicateReplay = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
          .select("+requestHash +comprobante.publicId")
          .lean();
        await this._cleanupUploadedComprobante(uploadedComprobante.publicId);
        if (duplicateReplay) return replayExisting(duplicateReplay);

        if (error.keyPattern?.referenciaNormalizada) {
          throw new AppError("Esta referencia ya fue registrada para la jornada.", 409, "REFERENCIA_DUPLICADA");
        }
        throw new AppError("El pago entra en conflicto con un registro existente.", 409, "PAGO_DUPLICADO");
      }

      if (error.hasErrorLabel?.("UnknownTransactionCommitResult")) {
        const possiblyCommitted = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
          .select("+requestHash +comprobante.publicId")
          .lean()
          .catch(() => null);
        if (possiblyCommitted) {
          if (possiblyCommitted.comprobante?.publicId !== uploadedComprobante.publicId) {
            await this._cleanupUploadedComprobante(uploadedComprobante.publicId);
          }
          return replayExisting(possiblyCommitted);
        }
        // El commit pudo completarse aunque la respuesta se perdiera: no borrar
        // el recurso hasta que la siguiente repetición resuelva la idempotencia.
        throw new AppError("No se pudo confirmar el pago. Reintente con la misma Idempotency-Key.", 503, "PAYMENT_COMMIT_UNCONFIRMED");
      }

      await this._cleanupUploadedComprobante(uploadedComprobante.publicId);
      throw error;
    } finally {
      if (session) await session.endSession().catch(() => {});
    }
  }

  async _cleanupUploadedComprobante(publicId) {
    try {
      await cloudinaryService.deleteComprobante(publicId);
    } catch (error) {
      console.error("No se pudo revertir un comprobante subido.", { code: error.code });
    }
  }

  _serializePublicResult(payment) {
    return {
      codigoSeguimiento: payment.codigoSeguimiento,
      estado: payment.estado,
      total: toVES(payment.totalCentavos),
      moneda: "VES",
      createdAt: payment.createdAt,
    };
  }

  async listPagos(query, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const filter = {};
    if (manager.role === "JEFE_COMUNIDAD") {
      if (query.comunidadId && query.comunidadId !== idOf(manager.comunidad)) {
        throw new AppError("No tiene permisos para consultar pagos de otra comunidad.", 403, "FORBIDDEN");
      }
      filter.comunidad = manager.comunidad;
    } else if (query.comunidadId) {
      filter.comunidad = query.comunidadId;
    }
    if (query.jornadaId) filter.jornada = query.jornadaId;
    if (query.estado) filter.estado = query.estado;
    if (query.search) {
      const safeSearch = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [
        { referenciaNormalizada: safeSearch },
        { codigoSeguimiento: safeSearch },
        { propietario: safeSearch },
        { calle: safeSearch },
        { numeroCasa: safeSearch },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [pagos, total] = await Promise.all([
      PagoBombona.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      PagoBombona.countDocuments(filter),
    ]);
    return {
      pagos: pagos.map(serializePayment),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPago(id, authenticatedUserId, includeComprobante = false) {
    const manager = await this._getManager(authenticatedUserId);
    let query = PagoBombona.findById(id);
    if (includeComprobante) {
      query = query.select("+comprobante.publicId +comprobante.format +comprobante.disponible +comprobante.expiraEn");
    }
    const payment = await query.lean();
    if (!payment) throw new AppError("Pago no encontrado.", 404, "PAGO_NOT_FOUND");
    this._assertCommunityScope(payment, manager);
    return payment;
  }

  async getPagoDetail(id, authenticatedUserId) {
    return serializePayment(await this.getPago(id, authenticatedUserId));
  }

  async getComprobante(id, authenticatedUserId) {
    const payment = await this.getPago(id, authenticatedUserId, true);
    if (
      !payment.comprobante?.disponible ||
      !payment.comprobante?.publicId ||
      payment.comprobante.expiraEn <= new Date()
    ) {
      throw new AppError("Comprobante no disponible.", 404, "COMPROBANTE_NOT_FOUND");
    }
    return cloudinaryService.generatePrivateDownloadUrl({
      publicId: payment.comprobante.publicId,
      format: payment.comprobante.format,
    });
  }

  async reviewPago(id, data, authenticatedUserId) {
    const manager = await this._getManager(authenticatedUserId);
    const payment = await PagoBombona.findById(id).lean();
    if (!payment) throw new AppError("Pago no encontrado.", 404, "PAGO_NOT_FOUND");
    this._assertCommunityScope(payment, manager);

    if (payment.estado !== "pendiente") {
      if (payment.estado === data.estado) return serializePayment(payment);
      throw new AppError("El pago ya fue revisado y no se puede cambiar.", 409, "PAGO_YA_REVISADO");
    }

    const updated = await PagoBombona.findOneAndUpdate(
      {
        _id: id,
        estado: "pendiente",
        ...(manager.role === "JEFE_COMUNIDAD" ? { comunidad: manager.comunidad } : {}),
      },
      {
        $set: {
          estado: data.estado,
          revisadoPor: manager._id,
          fechaRevision: new Date(),
          motivoRechazo: data.estado === "rechazado" ? data.motivoRechazo : null,
        },
      },
      { new: true },
    ).lean();
    if (updated) return serializePayment(updated);

    const current = await PagoBombona.findById(id).lean();
    if (!current) throw new AppError("Pago no encontrado.", 404, "PAGO_NOT_FOUND");
    this._assertCommunityScope(current, manager);
    if (current.estado === data.estado) return serializePayment(current);
    throw new AppError("El pago ya fue revisado y no se puede cambiar.", 409, "PAGO_YA_REVISADO");
  }
}

export default new BombonaService();
