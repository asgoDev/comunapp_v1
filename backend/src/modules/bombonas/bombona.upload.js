import { createHash } from "node:crypto";
import multer from "multer";
import AppError from "../../shared/errors/AppError.js";

export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_COMPROBANTE_BYTES + 32 * 1024;

const MIME_EXTENSION = new Map([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COMPROBANTE_BYTES,
    files: 1,
    fields: 8,
    parts: 9,
    fieldNameSize: 50,
    fieldSize: 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extensions = MIME_EXTENSION.get(file.mimetype);
    const extension = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (!extensions || !extensions.has(extension)) {
      return callback(new AppError("El comprobante debe ser JPG o PNG con extensión y MIME coherentes.", 415, "INVALID_FILE_TYPE"));
    }
    callback(null, true);
  },
});

export const parseComprobante = (req, res, next) => {
  upload.single("comprobante")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return next(
        new AppError(
          tooLarge
            ? "El comprobante no puede superar 5 MB."
            : "La solicitud contiene demasiados campos o archivos.",
          tooLarge ? 413 : 400,
          tooLarge ? "FILE_TOO_LARGE" : "INVALID_MULTIPART_REQUEST",
        ),
      );
    }

    next(error);
  });
};

export const enforceMultipartContentLength = (req, _res, next) => {
  const contentLength = req.get("Content-Length");
  if (contentLength === undefined) return next();

  if (!/^\d+$/.test(contentLength)) {
    return next(new AppError("Content-Length inválido.", 400, "INVALID_CONTENT_LENGTH"));
  }
  if (Number(contentLength) > MAX_MULTIPART_BYTES) {
    return next(new AppError("La solicitud excede el tamaño máximo permitido.", 413, "REQUEST_TOO_LARGE"));
  }
  next();
};

export const validateComprobanteSignature = (file) => {
  if (!file?.buffer?.length) {
    throw new AppError("Debe adjuntar un comprobante de pago.", 400, "FILE_REQUIRED");
  }

  const bytes = file.buffer;
  const signatures = {
    "image/jpeg": bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    "image/png": bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  };

  if (!Object.hasOwn(signatures, file.mimetype)) {
    throw new AppError("Tipo MIME de comprobante no permitido.", 415, "INVALID_FILE_TYPE");
  }

  const validSignature = signatures[file.mimetype];
  if (!validSignature) {
    throw new AppError("La firma del comprobante no corresponde a su tipo declarado.", 415, "INVALID_FILE_SIGNATURE");
  }

  return {
    contentType: file.mimetype,
    format: file.mimetype === "image/jpeg" ? "jpg" : "png",
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    buffer: bytes,
  };
};
