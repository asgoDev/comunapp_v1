import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Comunidad from "../src/modules/comunidades/comunidad.model.js";
import Habitante from "../src/modules/habitantes/habitante.model.js";
import User from "../src/modules/users/user.model.js";
import JornadaBombona from "../src/modules/bombonas/jornadaBombona.model.js";
import PagoBombona from "../src/modules/bombonas/pagoBombona.model.js";
import bombonaService from "../src/modules/bombonas/bombona.service.js";
import cloudinaryService from "../src/modules/bombonas/cloudinary.service.js";

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

const asyncQuery = (value) => {
  const query = {
    session: () => query,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };
  return query;
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

  it("el listado público agrupa por calle y ordena casas numéricas", async (t) => {
    const comunidad = { _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA), nombre: "Comunidad propia" };
    t.mock.method(Comunidad, "findOne", () => queryChain(comunidad));
    t.mock.method(JornadaBombona, "findOne", () =>
      queryChain({
        preciosCentavos: { grande: 25000, mediana: 18000, pequena: 12000 },
        pagoMovil: { banco: "Banesco", telefono: "0414-1234567", documento: "V-12345678", titular: "Ana Perez" },
      }),
    );
    t.mock.method(Habitante, "aggregate", async () => [
      { _id: "Calle 2", casas: ["10", "2", "10", "1A"] },
      { _id: "Principal", casas: ["4", "1"] },
      { _id: "Calle vacía", casas: ["A"] },
    ]);

    const result = await bombonaService.getPublicJornada(COMUNIDAD_PROPIA);

    assert.deepEqual(result.viviendas, [
      { calle: "Calle 2", casas: ["2", "10"] },
      { calle: "Principal", casas: ["1", "4"] },
    ]);
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
      calle: "Principal",
      numeroCasa: "14",
      propietario: "Ana Perez",
      referencia: "ABC12345",
      bombonasGrande: 1,
      bombonasMediana: 0,
      bombonasPequena: 2,
      website: "",
    };
    const comprobante = { sha256: "a".repeat(64), contentType: "image/png", format: "png", size: 8, buffer: Buffer.alloc(8) };

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
    t.mock.method(mongoose, "startSession", async () => session);
    t.mock.method(PagoBombona, "findOne", () => queryChain(persistedPayment?.toObject() ?? null));
    t.mock.method(Comunidad, "findOne", () => queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA) }));
    t.mock.method(JornadaBombona, "findOne", () => queryChain(activeJornada));
    t.mock.method(Habitante, "exists", () => asyncQuery({ _id: new mongoose.Types.ObjectId() }));
    t.mock.method(PagoBombona, "exists", () => asyncQuery(null));
    t.mock.method(JornadaBombona, "findOneAndUpdate", () => queryChain(activeJornada));
    const uploaded = {
      secureUrl: "https://res.cloudinary.com/test/image/authenticated/example.jpg",
      publicId: `comunapp/bombonas/test/${COMUNIDAD_PROPIA}/${JORNADA_ID}/11111111-1111-4111-8111-111111111114`,
      assetId: "cloudinary-asset-1",
      format: "png",
      resourceType: "image",
      deliveryType: "authenticated",
      size: 9,
    };
    const upload = t.mock.method(cloudinaryService, "uploadComprobante", async () => uploaded);
    t.mock.method(cloudinaryService, "deleteComprobante", async () => "ok");
    const save = t.mock.method(PagoBombona.prototype, "save", async function savePayment() {
      this.createdAt = new Date("2026-11-05T12:00:00.000Z");
      persistedPayment = this;
      return this;
    });

    const data = {
      calle: "Principal",
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
      format: "png",
      size: 9,
      sha256: "a".repeat(64),
      buffer: Buffer.from("png-falso-para-mock"),
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
    assert.equal(upload.mock.callCount(), 1);
    assert.equal(persistedPayment.idempotencyKeyHash.length, 64);
    assert.notEqual(persistedPayment.idempotencyKeyHash, idempotencyKey);
    assert.equal(persistedPayment.comprobante.secureUrl, uploaded.secureUrl);
    assert.equal("contenido" in persistedPayment.comprobante, false);
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
    t.mock.method(Habitante, "exists", () => asyncQuery({ _id: "habitante" }));
    t.mock.method(PagoBombona, "exists", () => asyncQuery({ _id: "pago-existente" }));
    const increment = t.mock.method(JornadaBombona, "findOneAndUpdate", () => queryChain(activeJornada));

    await assert.rejects(
      () =>
        bombonaService.createPublicPayment(
          COMUNIDAD_PROPIA,
          {
            calle: "Principal",
            numeroCasa: "14",
            propietario: "Ana Perez",
            referencia: "ABC12345",
            bombonasGrande: 1,
            bombonasMediana: 0,
            bombonasPequena: 0,
          },
          "11111111-1111-4111-8111-111111111112",
          { sha256: "b".repeat(64), contentType: "image/png", format: "png", size: 9, buffer: Buffer.alloc(9) },
        ),
      (error) => error.statusCode === 409 && error.code === "REFERENCIA_DUPLICADA",
    );
    assert.equal(increment.mock.callCount(), 0);
  });

  it("revierte en Cloudinary si MongoDB aborta después de subir el comprobante", async (t) => {
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
    const uploaded = {
      secureUrl: "https://res.cloudinary.com/test/image/authenticated/comprobante.jpg",
      publicId: `comunapp/bombonas/test/${COMUNIDAD_PROPIA}/${JORNADA_ID}/11111111-1111-4111-8111-111111111115`,
      assetId: "cloudinary-asset-2",
      format: "jpg",
      resourceType: "image",
      deliveryType: "authenticated",
      size: 10,
    };

    t.mock.method(mongoose, "startSession", async () => session);
    t.mock.method(PagoBombona, "findOne", () => queryChain(null));
    t.mock.method(Comunidad, "findOne", () => queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA) }));
    t.mock.method(JornadaBombona, "findOne", () => queryChain(activeJornada));
    t.mock.method(Habitante, "exists", () => asyncQuery({ _id: "habitante" }));
    t.mock.method(PagoBombona, "exists", () => asyncQuery(null));
    t.mock.method(cloudinaryService, "uploadComprobante", async () => uploaded);
    const deleteUpload = t.mock.method(cloudinaryService, "deleteComprobante", async () => "ok");
    t.mock.method(JornadaBombona, "findOneAndUpdate", () => {
      throw new Error("MongoDB write failed");
    });

    await assert.rejects(
      () =>
        bombonaService.createPublicPayment(
          COMUNIDAD_PROPIA,
          {
            calle: "Principal",
            numeroCasa: "14",
            propietario: "Ana Perez",
            referencia: "ABC12345",
            bombonasGrande: 1,
            bombonasMediana: 0,
            bombonasPequena: 0,
          },
          "11111111-1111-4111-8111-111111111115",
          { sha256: "d".repeat(64), contentType: "image/jpeg", format: "jpg", size: 10, buffer: Buffer.alloc(10) },
        ),
      /MongoDB write failed/,
    );
    assert.equal(deleteUpload.mock.callCount(), 1);
    assert.equal(deleteUpload.mock.calls[0].arguments[0], uploaded.publicId);
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
            calle: "Principal",
            numeroCasa: "14",
            propietario: "Ana Perez",
            referencia: "ABC12345",
            bombonasGrande: 1,
            bombonasMediana: 0,
            bombonasPequena: 0,
          },
          "11111111-1111-4111-8111-111111111113",
          { sha256: "c".repeat(64), contentType: "image/png", format: "png", size: 9, buffer: Buffer.alloc(9) },
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

  it("genera una URL firmada solo después de aplicar scoping sobre el comprobante", async (t) => {
    mockManager(t, managerAdmin);
    const publicId = `comunapp/bombonas/test/${COMUNIDAD_PROPIA}/${JORNADA_ID}/11111111-1111-4111-8111-111111111116`;
    t.mock.method(PagoBombona, "findById", () => queryChain({
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      comprobante: {
        disponible: true,
        publicId,
        format: "jpg",
        expiraEn: new Date(Date.now() + 60_000),
      },
    }));
    const signedUrl = t.mock.method(cloudinaryService, "generatePrivateDownloadUrl", async () => ({
      url: "https://api.cloudinary.com/v1_1/cloud-test/image/download?signed=true",
      expiresAt: new Date(Date.now() + 300_000),
    }));

    const result = await bombonaService.getComprobante(JORNADA_ID, ADMIN_ID);

    assert.match(result.url, /^https:\/\/api\.cloudinary\.com\//);
    assert.equal(signedUrl.mock.calls[0].arguments[0].publicId, publicId);
    assert.equal(signedUrl.mock.calls[0].arguments[0].format, "jpg");
  });

  it("aplica el filtro exacto de calle en el listado administrativo de pagos", async (t) => {
    mockManager(t, managerAdmin);
    let capturedFilter;
    t.mock.method(PagoBombona, "find", (filter) => {
      capturedFilter = filter;
      return queryChain([]);
    });
    t.mock.method(PagoBombona, "countDocuments", async () => 0);

    await bombonaService.listPagos(
      { page: 1, limit: 20, calle: "Calle 2" },
      ADMIN_ID,
    );

    assert.equal(capturedFilter.calle, "Calle 2");
  });

  it("lista calles únicas, ordenadas y sin vacíos para una jornada del scope", async (t) => {
    mockManager(t, {
      _id: new mongoose.Types.ObjectId(ADMIN_ID),
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(JornadaBombona, "findById", () => queryChain({
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
    }));
    const distinct = t.mock.method(PagoBombona, "distinct", async () => [
      "Calle 2",
      " Principal ",
      "",
      "Calle 2",
      "Avenida 1",
    ]);

    const result = await bombonaService.listCallesPorJornada(JORNADA_ID, ADMIN_ID);

    assert.deepEqual(result.calles, ["Avenida 1", "Calle 2", "Principal"]);
    assert.equal(distinct.mock.callCount(), 1);
  });

  it("rechaza las calles de una jornada ajena sin consultar pagos", async (t) => {
    mockManager(t, {
      _id: new mongoose.Types.ObjectId(ADMIN_ID),
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(JornadaBombona, "findById", () => queryChain({
      _id: new mongoose.Types.ObjectId(JORNADA_ID),
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_AJENA),
    }));
    const distinct = t.mock.method(PagoBombona, "distinct", async () => ["Calle 2"]);

    await assert.rejects(
      () => bombonaService.listCallesPorJornada(JORNADA_ID, ADMIN_ID),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
    assert.equal(distinct.mock.callCount(), 0);
  });
});
