import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import AppError from "../src/shared/errors/AppError.js";

process.env.JWT_ACCESS_SECRET = randomUUID();
process.env.JWT_REFRESH_SECRET = randomUUID();
process.env.JWT_ACCESS_EXPIRES = "15m";
process.env.JWT_REFRESH_EXPIRES = "8h";
process.env.NODE_ENV = "production";
process.env.RENDER = "false";

const { default: authController } = await import(
  "../src/modules/auth/auth.controller.js"
);
const { default: authService } = await import(
  "../src/modules/auth/auth.service.js"
);

const createResponse = () => ({
  cookies: [],
  clearedCookies: [],
  body: null,
  cookie(name, value, options) {
    this.cookies.push({ name, value, options });
    return this;
  },
  clearCookie(name, options) {
    this.clearedCookies.push({ name, options });
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

describe("AuthController — contrato cookie-only (R-03)", () => {
  it("login escribe cookies HttpOnly y no expone refreshToken en JSON", async (t) => {
    t.mock.method(authService, "login", async () => ({
      user: { id: "user-1", role: "LIDER_CALLE" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }));

    const req = { body: { identifier: "user@example.com", password: "secreto" } };
    const res = createResponse();
    const next = t.mock.fn();

    await authController.login(req, res, next);

    assert.equal(res.body.accessToken, "access-token");
    assert.equal("refreshToken" in res.body, false);
    assert.deepEqual(
      res.cookies.map((cookie) => cookie.name),
      ["accessToken", "refreshToken"],
    );

    const refreshCookie = res.cookies.find(
      (cookie) => cookie.name === "refreshToken",
    );
    assert.equal(refreshCookie.options.httpOnly, true);
    assert.equal(refreshCookie.options.secure, true);
    assert.equal(refreshCookie.options.sameSite, "none");
    assert.equal(next.mock.callCount(), 0);
  });

  it("refresh usa solo la cookie e ignora un token enviado en el body", async (t) => {
    const refreshMock = t.mock.method(authService, "refresh", async () => ({
      accessToken: "nuevo-access",
      refreshToken: "nuevo-refresh",
    }));

    const req = {
      cookies: { refreshToken: "token-de-cookie" },
      body: { refreshToken: "token-de-body" },
    };
    const res = createResponse();

    await authController.refresh(req, res, t.mock.fn());

    assert.equal(refreshMock.mock.calls[0].arguments[0], "token-de-cookie");
    assert.equal(res.body.accessToken, "nuevo-access");
    assert.equal("refreshToken" in res.body, false);
  });

  it("refresh sin cookie falla aunque el body contenga un token", async (t) => {
    const refreshMock = t.mock.method(authService, "refresh", async () => {
      throw new AppError(
        "No se proporcionó refresh token.",
        401,
        "MISSING_REFRESH_TOKEN",
      );
    });

    const req = { body: { refreshToken: "token-de-body" } };
    const res = createResponse();
    const next = t.mock.fn();

    await authController.refresh(req, res, next);

    assert.equal(refreshMock.mock.calls[0].arguments[0], undefined);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0].arguments[0].code, "MISSING_REFRESH_TOKEN");
    assert.deepEqual(
      res.clearedCookies.map((cookie) => cookie.name),
      ["accessToken", "refreshToken"],
    );
    assert.equal(res.body, null);
  });

  it("logout invalida solo la cookie y limpia ambas cookies", async (t) => {
    const invalidateMock = t.mock.method(
      authService,
      "invalidateRefreshToken",
      async () => {},
    );
    const req = {
      cookies: { refreshToken: "cookie-refresh" },
      body: { refreshToken: "body-refresh" },
    };
    const res = createResponse();

    await authController.logout(req, res, t.mock.fn());

    assert.equal(invalidateMock.mock.calls[0].arguments[0], "cookie-refresh");
    assert.deepEqual(
      res.clearedCookies.map((cookie) => cookie.name),
      ["accessToken", "refreshToken"],
    );
    assert.equal(res.body.message, "Sesión cerrada exitosamente");
  });

  it("logout sin cookie responde 200 y es idempotente", async (t) => {
    const invalidateMock = t.mock.method(
      authService,
      "invalidateRefreshToken",
      async () => {},
    );
    const req = { body: { refreshToken: "body-refresh" } };
    const res = createResponse();

    await authController.logout(req, res, t.mock.fn());

    assert.equal(invalidateMock.mock.callCount(), 0);
    assert.equal(res.body.message, "Sesión cerrada exitosamente");
  });
});
