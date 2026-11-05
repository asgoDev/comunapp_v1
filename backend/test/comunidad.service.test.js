import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Comunidad from "../src/modules/comunidades/comunidad.model.js";
import User from "../src/modules/users/user.model.js";
import Habitante from "../src/modules/habitantes/habitante.model.js";
import comunidadService from "../src/modules/comunidades/comunidad.service.js";

const COMUNIDAD_PROPIA = "64f0c2a1b2c3d4e5f6071829";
const COMUNIDAD_AJENA = "64f0c2a1b2c3d4e5f6071830";

/**
 * Query encadenable mínima de Mongoose para pruebas unitarias.
 */
const queryChain = (value) => {
  const chain = {
    select: () => chain,
    skip: () => chain,
    limit: () => chain,
    sort: () => chain,
    lean: async () => value,
  };
  return chain;
};

const mockAuthUser = (t, user) => {
  t.mock.method(User, "findById", () => queryChain(user));
};

describe("ComunidadService — scoping de lectura (R-01)", () => {
  it("admin lista todas las comunidades activas sin filtro territorial", async (t) => {
    mockAuthUser(t, { role: "admin", estado: "activo" });

    let capturedFilter = null;
    t.mock.method(Comunidad, "find", (filter) => {
      capturedFilter = filter;
      return queryChain([]);
    });
    t.mock.method(Comunidad, "countDocuments", async () => 0);

    const result = await comunidadService.getAll({ page: 1, limit: 20 }, "user-admin");

    assert.deepEqual(capturedFilter, { activo: true });
    assert.equal(result.comunidades.length, 0);
    assert.equal(result.pagination.total, 0);
  });

  it("JEFE_COMUNIDAD solo lista su propia comunidad y cuenta con el mismo filtro", async (t) => {
    const comunidadId = new mongoose.Types.ObjectId(COMUNIDAD_PROPIA);
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: comunidadId,
      estado: "activo",
    });

    let capturedFilter = null;
    let capturedCountFilter = null;
    t.mock.method(Comunidad, "find", (filter) => {
      capturedFilter = filter;
      return queryChain([{ _id: comunidadId, nombre: "Propia" }]);
    });
    t.mock.method(Comunidad, "countDocuments", async (filter) => {
      capturedCountFilter = filter;
      return 1;
    });

    const result = await comunidadService.getAll({ page: 1, limit: 20 }, "user-jefe");

    assert.equal(capturedFilter._id.toString(), COMUNIDAD_PROPIA);
    assert.equal(capturedFilter.activo, true);
    assert.equal(capturedCountFilter._id.toString(), COMUNIDAD_PROPIA);
    assert.equal(result.pagination.total, 1);
  });

  it("JEFE_COMUNIDAD sin comunidad asignada falla cerrado", async (t) => {
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: null,
      estado: "activo",
    });

    await assert.rejects(
      () => comunidadService.getAll({}, "user-sin-comunidad"),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
  });

  it("usuario inactivo no puede listar comunidades", async (t) => {
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "inactivo",
    });

    await assert.rejects(
      () => comunidadService.getAll({}, "user-inactivo"),
      (error) => error.statusCode === 401 && error.code === "USER_NOT_FOUND",
    );
  });

  it("JEFE_COMUNIDAD obtiene su propia comunidad", async (t) => {
    const comunidadId = new mongoose.Types.ObjectId(COMUNIDAD_PROPIA);
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: comunidadId,
      estado: "activo",
    });
    t.mock.method(Comunidad, "findOne", () =>
      queryChain({ _id: comunidadId, nombre: "Propia" }),
    );

    const result = await comunidadService.getById(COMUNIDAD_PROPIA, "user-jefe");

    assert.equal(result._id.toString(), COMUNIDAD_PROPIA);
  });

  it("JEFE_COMUNIDAD recibe 403 al consultar una comunidad ajena", async (t) => {
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(Comunidad, "findOne", () =>
      queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_AJENA) }),
    );

    await assert.rejects(
      () => comunidadService.getById(COMUNIDAD_AJENA, "user-jefe"),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
  });

  it("una comunidad inexistente responde 404 antes de evaluar propiedad", async (t) => {
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(Comunidad, "findOne", () => queryChain(null));

    await assert.rejects(
      () => comunidadService.getById(COMUNIDAD_AJENA, "user-jefe"),
      (error) => error.statusCode === 404 && error.code === "COMUNIDAD_NOT_FOUND",
    );
  });

  it("un ID inválido responde 400 sin consultar la BD", async () => {
    await assert.rejects(
      () => comunidadService.getById("id-invalido", "user-jefe"),
      (error) => error.statusCode === 400 && error.code === "INVALID_COMUNIDAD_ID",
    );
  });

  it("el resumen de una comunidad ajena no ejecuta conteos", async (t) => {
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: new mongoose.Types.ObjectId(COMUNIDAD_PROPIA),
      estado: "activo",
    });
    t.mock.method(Comunidad, "findOne", () =>
      queryChain({ _id: new mongoose.Types.ObjectId(COMUNIDAD_AJENA), nombre: "Ajena" }),
    );
    const userCount = t.mock.method(User, "countDocuments", async () => 0);
    const habitanteCount = t.mock.method(Habitante, "countDocuments", async () => 0);

    await assert.rejects(
      () => comunidadService.getSummary(COMUNIDAD_AJENA, "user-jefe"),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
    assert.equal(userCount.mock.callCount(), 0);
    assert.equal(habitanteCount.mock.callCount(), 0);
  });

  it("el resumen propio devuelve los conteos existentes", async (t) => {
    const comunidadId = new mongoose.Types.ObjectId(COMUNIDAD_PROPIA);
    mockAuthUser(t, {
      role: "JEFE_COMUNIDAD",
      comunidad: comunidadId,
      estado: "activo",
    });
    t.mock.method(Comunidad, "findOne", () =>
      queryChain({ _id: comunidadId, nombre: "Propia" }),
    );
    t.mock.method(User, "countDocuments", async () => 2);
    t.mock.method(Habitante, "countDocuments", async () => 10);

    const result = await comunidadService.getSummary(COMUNIDAD_PROPIA, "user-jefe");

    assert.deepEqual(result, {
      comunidad: "Propia",
      jefesComunidad: 2,
      lideresCalle: 2,
      habitantes: 10,
      jefesFamilia: 10,
    });
  });
});
