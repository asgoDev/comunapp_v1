import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Comunidad from "../comunidades/comunidad.model.js";
import Habitante from "../habitantes/habitante.model.js";
import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";
import JornadaBombona from "./jornadaBombona.model.js";
import PagoBombona from "./pagoBombona.model.js";

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
    ? { contentType: payment.comprobante.contentType, size: payment.comprobante.size }
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

    const casasRaw = await Habitante.distinct("numeroCasa", { comunidad: comunidad._id });
    const casas = [...new Set(casasRaw.map(String).filter((casa) => /^\d{1,8}$/.test(casa)))].sort(
      (left, right) => Number(left) - Number(right) || left.localeCompare(right),
    );

    return {
      comunidad: { _id: comunidad._id, nombre: comunidad.nombre },
      jornada: {
        precios: serializePrices(jornada.preciosCentavos),
        moneda: "VES",
        pagoMovil: jornada.pagoMovil,
      },
      casas,
      limites: { maxPorTipo: 10, maxTotal: 20 },
    };
  }

  async createPublicPayment(comunidadId, data, idempotencyKey, comprobante) {
    const keyHash = hashKey(idempotencyKey);
    const normalizedData = { ...data, propietario: normalizeText(data.propietario) };
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

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const inTransaction = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
          .select("+requestHash")
          .session(session)
          .lean();
        if (inTransaction) return replayExisting(inTransaction);

        const comunidadActiva = await Comunidad.findOne({ _id: comunidadId, activo: true })
          .select("_id")
          .session(session)
          .lean();
        if (!comunidadActiva) {
          throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
        }

        const jornada = await JornadaBombona.findOne({ comunidad: comunidadId, activa: true })
          .session(session)
          .lean();
        if (!jornada) {
          throw new AppError("No hay jornadas activas para esta comunidad.", 404, "JORNADA_NO_ACTIVA");
        }

        const casaExiste = await Habitante.exists({ comunidad: comunidadId, numeroCasa: data.numeroCasa })
          .session(session);
        if (!casaExiste) {
          throw new AppError("El número de casa no pertenece a esta comunidad.", 400, "CASA_NO_ENCONTRADA");
        }

        const referenciaNormalizada = data.referencia.trim().toUpperCase();
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
          numeroCasa: data.numeroCasa,
          propietario: normalizedData.propietario,
          referencia: referenciaNormalizada,
          referenciaNormalizada,
          bombonas: quantities,
          preciosCentavos,
          totalCentavos,
          idempotencyKeyHash: keyHash,
          requestHash,
          comprobante,
        });
        await payment.save({ session });

        return { pago: this._serializePublicResult(payment), replay: false };
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;

      const duplicateReplay = await PagoBombona.findOne({ comunidad: comunidadId, idempotencyKeyHash: keyHash })
        .select("+requestHash")
        .lean();
      if (duplicateReplay) return replayExisting(duplicateReplay);

      if (error.keyPattern?.referenciaNormalizada) {
        throw new AppError("Esta referencia ya fue registrada para la jornada.", 409, "REFERENCIA_DUPLICADA");
      }
      throw new AppError("El pago entra en conflicto con un registro existente.", 409, "PAGO_DUPLICADO");
    } finally {
      await session.endSession();
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
    if (includeComprobante) query = query.select("+comprobante.contenido");
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
    if (!payment.comprobante?.contenido) {
      throw new AppError("Comprobante no disponible.", 404, "COMPROBANTE_NOT_FOUND");
    }
    return {
      contenido: payment.comprobante.contenido,
      contentType: payment.comprobante.contentType,
      size: payment.comprobante.size,
      codigoSeguimiento: payment.codigoSeguimiento,
    };
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
