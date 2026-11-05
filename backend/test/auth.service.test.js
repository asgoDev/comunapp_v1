import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../src/modules/users/user.model.js";
import TokenBlacklist from "../src/modules/auth/auth.model.js";

// Secretos efímeros exclusivos de la prueba; nunca se usan en entornos reales.
process.env.JWT_ACCESS_SECRET = randomUUID();
process.env.JWT_REFRESH_SECRET = randomUUID();
process.env.JWT_ACCESS_EXPIRES = "15m";
process.env.JWT_REFRESH_EXPIRES = "8h";

const [
  { default: authService },
  { generateRefreshToken, verifyRefreshToken },
] = await Promise.all([
  import("../src/modules/auth/auth.service.js"),
  import("../src/infrastructure/jwt/jwt.utils.js"),
]);

const USER_ID = "64f0c2a1b2c3d4e5f6071829";
const TOKEN_PAYLOAD = { id: USER_ID, role: "LIDER_CALLE" };

const mockActiveUser = (t, user = { _id: USER_ID, role: "LIDER_CALLE", estado: "activo" }) => {
  t.mock.method(User, "findById", async () => user);
};

const duplicateKeyError = () => {
  const error = new Error("E11000 duplicate key");
  error.code = 11000;
  return error;
};

describe("AuthService — rotación de refresh token (R-02)", () => {
  it("genera refresh tokens únicos aunque se emitan en el mismo segundo", () => {
    const first = generateRefreshToken(TOKEN_PAYLOAD);
    const second = generateRefreshToken(TOKEN_PAYLOAD);

    assert.notEqual(first, second);
    assert.notEqual(verifyRefreshToken(first).jti, verifyRefreshToken(second).jti);
    assert.deepEqual(verifyRefreshToken(first).id, USER_ID);
    assert.equal(verifyRefreshToken(first).role, "LIDER_CALLE");
  });

  it("consume el token presentado antes de emitir el nuevo par", async (t) => {
    const oldToken = generateRefreshToken(TOKEN_PAYLOAD);
    const expectedHash = createHash("sha256").update(oldToken).digest("hex");
    mockActiveUser(t);

    let consumedHash = null;
    t.mock.method(TokenBlacklist, "create", async (document) => {
      consumedHash = document.tokenHash;
      return document;
    });

    const result = await authService.refresh(oldToken);

    assert.equal(consumedHash, expectedHash);
    assert.notEqual(result.refreshToken, oldToken);
    assert.equal(verifyRefreshToken(result.refreshToken).id, USER_ID);
    assert.ok(result.accessToken);
  });

  it("rechaza un refresh ya consumido sin emitir tokens nuevos", async (t) => {
    const oldToken = generateRefreshToken(TOKEN_PAYLOAD);
    mockActiveUser(t);
    t.mock.method(TokenBlacklist, "create", async () => {
      throw duplicateKeyError();
    });

    await assert.rejects(
      () => authService.refresh(oldToken),
      (error) =>
        error.statusCode === 401 && error.code === "REVOKED_REFRESH_TOKEN",
    );
  });

  it("en dos rotaciones concurrentes solo una puede consumir el token", async (t) => {
    const oldToken = generateRefreshToken(TOKEN_PAYLOAD);
    mockActiveUser(t);

    let attempts = 0;
    t.mock.method(TokenBlacklist, "create", async (document) => {
      attempts += 1;
      if (attempts === 2) throw duplicateKeyError();
      return document;
    });

    const results = await Promise.allSettled([
      authService.refresh(oldToken),
      authService.refresh(oldToken),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, "REVOKED_REFRESH_TOKEN");
    assert.equal(attempts, 2);
  });

  it("no consume tokens inválidos ni tokens de usuarios inactivos", async (t) => {
    const invalidToken = jwt.sign(TOKEN_PAYLOAD, randomUUID(), { expiresIn: "8h" });
    const createMock = t.mock.method(TokenBlacklist, "create", async (document) => document);

    await assert.rejects(
      () => authService.refresh(invalidToken),
      (error) =>
        error.statusCode === 401 && error.code === "INVALID_REFRESH_TOKEN",
    );
    assert.equal(createMock.mock.callCount(), 0);

    mockActiveUser(t, {
      _id: USER_ID,
      role: "LIDER_CALLE",
      estado: "inactivo",
    });

    await assert.rejects(
      () => authService.refresh(generateRefreshToken(TOKEN_PAYLOAD)),
      (error) =>
        error.statusCode === 401 && error.code === "USER_UNAVAILABLE",
    );
    assert.equal(createMock.mock.callCount(), 0);
  });

  it("logout sigue siendo idempotente ante un token ya revocado", async (t) => {
    const token = generateRefreshToken(TOKEN_PAYLOAD);
    const expectedHash = createHash("sha256").update(token).digest("hex");
    let savedHash = null;

    t.mock.method(TokenBlacklist, "create", async (document) => {
      savedHash = document.tokenHash;
      throw duplicateKeyError();
    });

    await assert.doesNotReject(() => authService.invalidateRefreshToken(token));
    assert.equal(savedHash, expectedHash);
  });
});
