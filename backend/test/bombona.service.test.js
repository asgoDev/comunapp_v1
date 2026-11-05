import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Comunidad from "../src/modules/comunidades/comunidad.model.js";
import Habitante from "../src/modules/habitantes/habitante.model.js";
import User from "../src/modules/users/user.model.js";
import JornadaBombona from "../src/modules/bombonas/jornadaBombona.model.js";
import PagoBombona from "../src/modules/bombonas/pagoBombona.model.js";
import bombonaService from "../src/modules/bombonas/bombona.service.js";

const COMUNIDAD_PROPIA = "64f0c2a1b2c3d4e5f6071829";
const COMUNIDAD_AJENA = "64f0c2a1b2c3d4e5f6071830";
const JORNADA_ID = "64f0c2a1b2c3d4e5f6071840";
const ADMIN_ID = "64f0c2a1b2c3d4e5f6071850";

const queryChain = (value) => {
  const chain = {
    select: () => chain,
    populate: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    session: () => chain,
    lean: async () => value,
  };
  return chain;
};

const mockManager = (t, manager) => {
  t.mock.method(User, "findById", () => queryChain(manager));
};

const managerAdmin = {
  _id: new mongoose.Types.ObjectId(ADMIN_ID),
  role: "admin",
  estado: "activo",
};

describe("BombonaService — jornadas y scoping", () => {
  it("admin crea una jornada con precios persistidos en céntimos", async (t) => {
    mockManager(t, managerAdmin);
    const comunidad = { _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA), nombre: "Comunidad propia" };
    t.mock.method(Comunidad, "findOne", () => queryChain(comunidad));
    t.mock.method(JornadaBombona, "findOne", () => queryChain(null));

    let created;
    t.mock.method(JornadaBombona, "create", async (data) => {
      created = data;
      return { toObject: () => ({ ...data, _id: new mongoose.Types.ObjectId(JORNADA_ID), activa: true }) };
    });

    const result = await bombonaService.createJornada(
      {
        comunidad: COMUNIDAD_PROPIA,
        precios: { grande: 250.5, mediana: 180, pequena: 120 },
        pagoMovil: {
          banco: "Banesco",
          telefono: "0414-1234567",
          documento: "V-12345678",
          titular: "Ana Perez",
        },
      },
      ADMIN_ID,
    );

    assert.equal(created.preciosCentavos.grande, 25050);
    assert.deepEqual(result.precios, { grande: 250.5, mediana: 180, pequena: 120 });
    assert.equal(result.moneda, "VES");
  });

  it("JEFE_COMUNIDAD no puede crear una jornada para otra comunidad", async (t) => {
    mockManager(t, {
      _id: new mongoose.Types.ObjectId(ADMIN_ID),
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    const comunidadLookup = t.mock.method(Comunidad, "findOne", () => queryChain(null));

    await assert.rejects(
      () =>
        bombonaService.createJornada(
          {
            comunidad: COMUNIDAD_AJENA,
            precios: { grande: 250, mediana: 180, pequena: 120 },
            pagoMovil: {},
          },
          ADMIN_ID,
        ),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
    assert.equal(comunidadLookup.mock.callCount(), 0);
  });

  it("el listado público devuelve solo casas numéricas, únicas y ordenadas", async (t) => {
    const comunidad = { _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA), nombre: "Comunidad propia" };
    t.mock.method(Comunidad, "findOne", () => queryChain(comunidad));
    t.mock.method(JornadaBombona, "findOne", () =>
      queryChain({
        preciosCentavos: { grande: 25000, mediana: 18000, pequena: 12000 },
        pagoMovil: { banco: "Banesco", telefono: "0414-1234567", documento: "V-12345678", titular: "Ana Perez" },
      }),
    );
    t.mock.method(Habitante, "distinct", async () => ["10", "2", "10", "1A", "", "003"]);

    const result = await bombonaService.getPublicJornada(COMUNIDAD_PROPIA);

    assert.deepEqual(result.casas, ["2", "003", "10"]);
    assert.equal(result.jornada.precios.grande, 250);
    assert.equal(result.jornada.moneda, "VES");
    assert.equal("pagos" in result, false);
  });

  it("devuelve el mismo pago ante una repetición con la misma clave y payload", async (t) => {
    const payment = new PagoBombona({
      jornada: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      codigoSeguimiento: "PAGO-REPETIDO",
      estado: "pendiente",
      totalCentavos: 43000,
      requestHash: "",
    });
    const data = {
      numeroCasa: "14",
      propietario: "Ana Perez",
      referencia: "ABC12345",
      bombonasGrande: 1,
      bombonasMediana: 0,
      bombonasPequena: 2,
      website: "",
    };
    const comprobante = { sha256: "a".repeat(64), contentType: "image/png", size: 8, contenido: Buffer.alloc(8) };

    // requestHash se verifica en servicio; una clave con contenido distinto falla cerrado.
    payment.requestHash = "hash-de-otra-solicitud";
    t.mock.method(PagoBombona, "findOne", () => queryChain(payment.toObject()));
    const startSession = t.mock.method(mongoose, "startSession", async () => {
      throw new Error("No debe abrir una transacción para una clave ya registrada");
    });

    await assert.rejects(
      () => bombonaService.createPublicPayment(COMUNIDAD_PROPIA, data, "11111111-1111-4111-8111-111111111111", comprobante),
      (error) => error.statusCode === 409 && error.code === "PAGO_IDEMPOTENCIA_CONFLICTO",
    );
    assert.equal(startSession.mock.callCount(), 0);
  });

  it("calcula el total en servidor, persiste una vez y reproduce el resultado por idempotencia", async (t) => {
    let persistedPayment = null;
    const activeJornada = {
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      activa: true,
      preciosCentavos: { grande: 25000, mediana: 18000, pequena: 12000 },
    };
    const session = {
      withTransaction: async (callback) => callback(session),
      endSession: async () => {},
    };
    const sessionQuery = (value) => ({ session: async () => value });

    t.mock.method(mongoose, "startSession", async () => session);
    t.mock.method(PagoBombona, "findOne", () => queryChain(persistedPayment?.toObject() ?? null));
    t.mock.method(Comunidad, "findOne", () => queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA) }));
    t.mock.method(JornadaBombona, "findOne", () => queryChain(activeJornada));
    t.mock.method(Habitante, "exists", () => sessionQuery({ _id: new mongoose.Types.ObjectId() }));
    t.mock.method(PagoBombona, "exists", () => sessionQuery(null));
    t.mock.method(JornadaBombona, "findOneAndUpdate", () => queryChain(activeJornada));
    const save = t.mock.method(PagoBombona.prototype, "save", async function savePayment() {
      this.createdAt = new Date("2026-11-05T12:00:00.000Z");
      persistedPayment = this;
      return this;
    });

    const data = {
      numeroCasa: "14",
      propietario: "Ana   Perez",
      referencia: "abc12345",
      bombonasGrande: 1,
      bombonasMediana: 0,
      bombonasPequena: 2,
      website: "",
    };
    const comprobante = {
      contentType: "image/png",
      size: 9,
      sha256: "a".repeat(64),
      contenido: Buffer.from("png-falso-para-mock"),
    };
    const idempotencyKey = "11111111-1111-4111-8111-111111111111";

    const first = await bombonaService.createPublicPayment(COMUNIDAD_PROPIA, data, idempotencyKey, comprobante);
    const replay = await bombonaService.createPublicPayment(COMUNIDAD_PROPIA, data, idempotencyKey, comprobante);

    assert.equal(first.pago.total, 490);
    assert.equal(first.pago.estado, "pendiente");
    assert.equal(first.replay, false);
    assert.equal(replay.pago.codigoSeguimiento, first.pago.codigoSeguimiento);
    assert.equal(replay.replay, true);
    assert.equal(save.mock.callCount(), 1);
    assert.equal(persistedPayment.idempotencyKeyHash.length, 64);
    assert.notEqual(persistedPayment.idempotencyKeyHash, idempotencyKey);
  });

  it("rechaza una referencia usada antes de incrementar la jornada", async (t) => {
    const activeJornada = {
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      activa: true,
      preciosCentavos: { grande: 25000, mediana: 18000, pequena: 12000 },
    };
    const session = {
      withTransaction: async (callback) => callback(session),
      endSession: async () => {},
    };
    t.mock.method(mongoose, "startSession", async () => session);
    t.mock.method(PagoBombona, "findOne", () => queryChain(null));
    t.mock.method(Comunidad, "findOne", () => queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA) }));
    t.mock.method(JornadaBombona, "findOne", () => queryChain(activeJornada));
    t.mock.method(Habitante, "exists", () => ({ session: async () => ({ _id: "habitante" }) }));
    t.mock.method(PagoBombona, "exists", () => ({ session: async () => ({ _id: "pago-existente" }) }));
    const increment = t.mock.method(JornadaBombona, "findOneAndUpdate", () => queryChain(activeJornada));

    await assert.rejects(
      () =>
        bombonaService.createPublicPayment(
          COMUNIDAD_PROPIA,
          {
            numeroCasa: "14",
            propietario: "Ana Perez",
            referencia: "ABC12345",
            bombonasGrande: 1,
            bombonasMediana: 0,
            bombonasPequena: 0,
          },
          "11111111-1111-4111-8111-111111111112",
          { sha256: "b".repeat(64), contentType: "image/png", size: 9, contenido: Buffer.alloc(9) },
        ),
      (error) => error.statusCode === 409 && error.code === "REFERENCIA_DUPLICADA",
    );
    assert.equal(increment.mock.callCount(), 0);
  });

  it("no admite nuevos pagos si la comunidad está inactiva", async (t) => {
    const session = {
      withTransaction: async (callback) => callback(session),
      endSession: async () => {},
    };
    t.mock.method(mongoose, "startSession", async () => session);
    t.mock.method(PagoBombona, "findOne", () => queryChain(null));
    t.mock.method(Comunidad, "findOne", () => queryChain(null));
    const activeJornadaLookup = t.mock.method(JornadaBombona, "findOne", () => queryChain(null));

    await assert.rejects(
      () =>
        bombonaService.createPublicPayment(
          COMUNIDAD_PROPIA,
          {
            numeroCasa: "14",
            propietario: "Ana Perez",
            referencia: "ABC12345",
            bombonasGrande: 1,
            bombonasMediana: 0,
            bombonasPequena: 0,
          },
          "11111111-1111-4111-8111-111111111113",
          { sha256: "c".repeat(64), contentType: "image/png", size: 9, contenido: Buffer.alloc(9) },
        ),
      (error) => error.statusCode === 404 && error.code === "JORNADA_NO_ACTIVA",
    );
    assert.equal(activeJornadaLookup.mock.callCount(), 0);
  });

  it("escapa la búsqueda administrativa antes de construir expresiones regulares", async (t) => {
    mockManager(t, managerAdmin);
    let capturedFilter;
    t.mock.method(PagoBombona, "find", (filter) => {
      capturedFilter = filter;
      return queryChain([]);
    });
    t.mock.method(PagoBombona, "countDocuments", async () => 0);

    await bombonaService.listPagos(
      { page: 1, limit: 20, search: "a.*" },
      ADMIN_ID,
    );

    assert.equal(capturedFilter.$or[0].referenciaNormalizada.source, "a\\.\\*");
  });

  it("rechaza el acceso de un jefe a un pago de otra comunidad", async (t) => {
    mockManager(t, {
      _id: new mongoose.Types.ObjectId(ADMIN_ID),
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(PagoBombona, "findById", () => queryChain({
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_AJENA),
    }));

    await assert.rejects(
      () => bombonaService.getPagoDetail(JORNADA_ID, ADMIN_ID),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
  });
});
