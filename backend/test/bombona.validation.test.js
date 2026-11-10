import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import JornadaBombona from "../src/modules/bombonas/jornadaBombona.model.js";
import PagoBombona from "../src/modules/bombonas/pagoBombona.model.js";
import { createPublicPaymentSchema, createJornadaSchema, reviewPagoSchema } from "../src/modules/bombonas/bombona.validation.js";
import { enforceMultipartContentLength, MAX_COMPROBANTE_BYTES, validateComprobanteSignature } from "../src/modules/bombonas/bombona.upload.js";
import { listPagosQuerySchema } from "../src/modules/bombonas/bombona.validation.js";
import validate from "../src/shared/middleware/validate.js";

describe("Bombonas — validación de entrada y comprobantes", () => {
  it("rechaza campos del total/precios enviados por el cliente", () => {
    const result = createPublicPaymentSchema.safeParse({
      calle: "Principal",
      numeroCasa: "14",
      propietario: "Ana Perez",
      referencia: "ABC12345",
      bombonasGrande: "1",
      bombonasMediana: "0",
      bombonasPequena: "0",
      total: "1",
    });
    assert.equal(result.success, false);
  });

  it("rechaza casa alfanumérica y cantidades superiores al límite", () => {
    const invalidHouse = createPublicPaymentSchema.safeParse({
      calle: "Principal",
      numeroCasa: "14A",
      propietario: "Ana Perez",
      referencia: "ABC12345",
      bombonasGrande: "1",
      bombonasMediana: "0",
      bombonasPequena: "0",
    });
    const invalidQuantity = createPublicPaymentSchema.safeParse({
      calle: "Principal",
      numeroCasa: "14",
      propietario: "Ana Perez",
      referencia: "ABC12345",
      bombonasGrande: "11",
      bombonasMediana: "0",
      bombonasPequena: "0",
    });
    assert.equal(invalidHouse.success, false);
    assert.equal(invalidQuantity.success, false);
  });

  it("requiere motivo de rechazo y permite verificación sin motivo", () => {
    assert.equal(reviewPagoSchema.safeParse({ estado: "rechazado" }).success, false);
    assert.equal(reviewPagoSchema.safeParse({ estado: "verificado" }).success, true);
    assert.equal(reviewPagoSchema.safeParse({ estado: "verificado", motivoRechazo: "abcde" }).success, false);
  });

  it("valida y transforma precios, teléfono y documento de pago móvil", () => {
    const result = createJornadaSchema.safeParse({
      comunidad: "64f0c2a1b2c3d4e5f6071829",
      precios: { grande: 250.25, mediana: 180, pequena: 120 },
      pagoMovil: {
        banco: "Banesco",
        telefono: "0414-1234567",
        documento: "v-12345678",
        titular: "Ana Perez",
      },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.pagoMovil.documento, "V-12345678");
    assert.equal(createJornadaSchema.safeParse({
      comunidad: "64f0c2a1b2c3d4e5f6071829",
      precios: { grande: 1.001, mediana: 180, pequena: 120 },
      pagoMovil: { banco: "Banco", telefono: "0414-1234567", documento: "V-12345678", titular: "Ana Perez" },
    }).success, false);
  });

  it("valida la firma binaria y calcula hash del archivo aceptado", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const accepted = validateComprobanteSignature({ mimetype: "image/png", buffer: png });
    assert.equal(accepted.sha256, createHash("sha256").update(png).digest("hex"));
    assert.throws(
      () => validateComprobanteSignature({ mimetype: "image/png", buffer: Buffer.from("contenido no PNG") }),
      (error) => error.code === "INVALID_FILE_SIGNATURE",
    );
    assert.throws(
      () => validateComprobanteSignature({ mimetype: "application/pdf", buffer: Buffer.from("%PDF-") }),
      (error) => error.code === "INVALID_FILE_TYPE",
    );
  });

  it("declara índices únicos para jornada activa, referencia e idempotencia", () => {
    const jornadaIndexes = JornadaBombona.schema.indexes();
    const paymentIndexes = PagoBombona.schema.indexes();
    assert.equal(
      jornadaIndexes.some(([keys, options]) => keys.comunidad === 1 && options.unique && options.partialFilterExpression?.activa === true),
      true,
    );
    assert.equal(
      paymentIndexes.some(([keys, options]) => keys.comunidad === 1 && keys.idempotencyKeyHash === 1 && options.unique),
      true,
    );
    assert.equal(
      paymentIndexes.some(([keys, options]) => keys.jornada === 1 && keys.referenciaNormalizada === 1 && options.unique),
      true,
    );
    const comprobanteSchema = PagoBombona.schema.path("comprobante").schema;
    assert.equal(comprobanteSchema.path("contenido"), undefined);
    assert.equal(comprobanteSchema.path("secureUrl").options.select, false);
    assert.equal(comprobanteSchema.path("publicId").options.select, false);
  });

  it("valida query sin asignar sobre el getter req.query de Express", () => {
    const req = { query: { page: "2", limit: "10" } };
    let nextError;
    validate(listPagosQuerySchema, "query")(req, {}, (error) => {
      nextError = error;
    });

    assert.equal(nextError, undefined);
    assert.deepEqual(req.query, { page: "2", limit: "10" });
    assert.deepEqual(req.validatedQuery, { page: 2, limit: 10 });
  });

  it("rechaza Content-Length sobre el máximo multipart", () => {
    const req = {
      get: () => String(MAX_COMPROBANTE_BYTES + 32 * 1024 + 1),
    };
    let nextError;
    enforceMultipartContentLength(req, {}, (error) => {
      nextError = error;
    });
    assert.equal(nextError.statusCode, 413);
    assert.equal(nextError.code, "REQUEST_TOO_LARGE");
  });
});
