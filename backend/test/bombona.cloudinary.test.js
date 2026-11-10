import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import cloudinaryService from "../src/modules/bombonas/cloudinary.service.js";

const COMUNIDAD_ID = "64f0c2a1b2c3d4e5f6071829";
const JORNADA_ID = "64f0c2a1b2c3d4e5f6071840";

const configureTestEnvironment = () => {
  process.env.CLOUDINARY_CLOUD_NAME = "cloud-test";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret-not-real";
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS = "30000";
  process.env.NODE_ENV = "test";
};

describe("CloudinaryService — almacenamiento privado", () => {
  it("falla cerrado si faltan credenciales y no ofrece subida unsigned", async (t) => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    const upload = t.mock.method(cloudinary.uploader, "upload_stream", () => {
      throw new Error("No se debe invocar el SDK sin credenciales");
    });

    await assert.rejects(
      () => cloudinaryService.uploadComprobante(Buffer.from("imagen"), {
        comunidadId: COMUNIDAD_ID,
        jornadaId: JORNADA_ID,
        format: "jpg",
      }),
      (error) => error.statusCode === 503 && error.code === "CLOUDINARY_NOT_CONFIGURED",
    );
    assert.equal(upload.mock.callCount(), 0);
  });

  it("sube a carpeta separada por entorno/comunidad/jornada como authenticated", async (t) => {
    configureTestEnvironment();
    let capturedOptions;
    t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
      capturedOptions = options;
      const stream = new Writable({ write(_chunk, _encoding, done) { done(); } });
      process.nextTick(() => callback(null, {
        asset_id: "asset-uuid",
        public_id: options.public_id,
        secure_url: `https://res.cloudinary.com/cloud-test/image/authenticated/${options.public_id}.jpg`,
        resource_type: "image",
        type: "authenticated",
        format: "jpg",
        bytes: 128,
      }));
      return stream;
    });

    const result = await cloudinaryService.uploadComprobante(Buffer.from("jpeg-buffer"), {
      comunidadId: COMUNIDAD_ID,
      jornadaId: JORNADA_ID,
      format: "jpg",
    });

    assert.match(capturedOptions.public_id, new RegExp(`^comunapp/bombonas/test/${COMUNIDAD_ID}/${JORNADA_ID}/`));
    assert.equal(capturedOptions.asset_folder, `comunapp/bombonas/test/${COMUNIDAD_ID}/${JORNADA_ID}`);
    assert.equal(capturedOptions.type, "authenticated");
    assert.equal(capturedOptions.overwrite, false);
    assert.equal(capturedOptions.backup, false);
    assert.deepEqual(capturedOptions.allowed_formats, ["jpg", "jpeg", "png"]);
    assert.deepEqual(capturedOptions.headers, ["X-Robots-Tag: noindex"]);
    assert.equal("upload_preset" in capturedOptions, false);
    assert.equal(result.secureUrl.startsWith("https://res.cloudinary.com/"), true);
    assert.equal("buffer" in result, false);
  });

  it("genera acceso autenticado temporal como attachment", async (t) => {
    configureTestEnvironment();
    let capturedOptions;
    t.mock.method(cloudinary.utils, "private_download_url", (_publicId, _format, options) => {
      capturedOptions = options;
      return "https://api.cloudinary.com/v1_1/cloud-test/image/download?signed=true";
    });

    const before = Date.now();
    const result = await cloudinaryService.generatePrivateDownloadUrl({
      publicId: `comunapp/bombonas/test/${COMUNIDAD_ID}/${JORNADA_ID}/11111111-1111-4111-8111-111111111111`,
      format: "jpg",
    });

    assert.equal(capturedOptions.type, "authenticated");
    assert.equal(capturedOptions.resource_type, "image");
    assert.equal(capturedOptions.attachment, true);
    assert.ok(capturedOptions.expires_at >= Math.floor(before / 1000) + 299);
    assert.ok(capturedOptions.expires_at <= Math.floor(before / 1000) + 301);
    assert.equal(result.url.startsWith("https://api.cloudinary.com/"), true);
  });

  it("limita eliminaciones a public_id del módulo y trata la eliminación repetida como idempotente", async (t) => {
    configureTestEnvironment();
    const destroy = t.mock.method(cloudinary.uploader, "destroy", async () => ({ result: "not found" }));
    const publicId = `comunapp/bombonas/test/${COMUNIDAD_ID}/${JORNADA_ID}/11111111-1111-4111-8111-111111111111`;

    assert.equal(await cloudinaryService.deleteComprobante(publicId), "not found");
    await assert.rejects(
      () => cloudinaryService.deleteComprobante("otro-modulo/archivo"),
      (error) => error.statusCode === 400 && error.code === "INVALID_CLOUDINARY_PUBLIC_ID",
    );
    assert.equal(destroy.mock.callCount(), 1);
    assert.equal(destroy.mock.calls[0].arguments[1].type, "authenticated");
  });
});
