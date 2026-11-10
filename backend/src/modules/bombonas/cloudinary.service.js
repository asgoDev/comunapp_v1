import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import AppError from "../../shared/errors/AppError.js";

const PRIVATE_DELIVERY_URL_TTL_SECONDS = 5 * 60;
const SUPPORTED_FORMATS = new Set(["jpg", "jpeg", "png"]);
const CLOUDINARY_DELIVERY_HOSTS = new Set([
  "api.cloudinary.com",
  "api-eu.cloudinary.com",
  "api-ap.cloudinary.com",
]);

const requiredConfiguration = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError(
      "El almacenamiento de comprobantes no está configurado.",
      503,
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }

  return {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  };
};

const getTimeout = () => {
  const timeout = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 30000);
  if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 120000) {
    throw new AppError("CLOUDINARY_UPLOAD_TIMEOUT_MS debe estar entre 1000 y 120000.", 500, "INVALID_CLOUDINARY_CONFIG");
  }
  return timeout;
};

const configure = () => {
  cloudinary.config({
    ...requiredConfiguration(),
    secure: true,
    signature_algorithm: "sha256",
  });
};

const safeEnvironment = () => {
  const environment = (process.env.NODE_ENV || "development").toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(environment) ? environment : "other";
};

const createAssetLocation = (comunidadId, jornadaId) => {
  const folder = `comunapp/bombonas/${safeEnvironment()}/${comunidadId}/${jornadaId}`;
  return { folder, publicId: `${folder}/${randomUUID()}` };
};

const validateSecureAssetUrl = (secureUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(secureUrl);
  } catch {
    throw new AppError("Cloudinary devolvió una URL de comprobante inválida.", 502, "CLOUDINARY_INVALID_RESPONSE");
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com") {
    throw new AppError("Cloudinary devolvió una URL de comprobante inválida.", 502, "CLOUDINARY_INVALID_RESPONSE");
  }
  return secureUrl;
};

const validateDownloadUrl = (deliveryUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(deliveryUrl);
  } catch {
    throw new AppError("Cloudinary no pudo generar el acceso al comprobante.", 502, "CLOUDINARY_DOWNLOAD_FAILED");
  }
  if (parsedUrl.protocol !== "https:" || !CLOUDINARY_DELIVERY_HOSTS.has(parsedUrl.hostname)) {
    throw new AppError("Cloudinary no pudo generar el acceso al comprobante.", 502, "CLOUDINARY_DOWNLOAD_FAILED");
  }
  return deliveryUrl;
};

const destroyImage = async (publicId) => {
  configure();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
  if (!result || !["ok", "not found"].includes(result.result)) {
    throw new Error("Cloudinary no confirmó la eliminación del comprobante.");
  }
  return result.result;
};

class CloudinaryService {
  async uploadComprobante(buffer, { comunidadId, jornadaId, format }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError("El comprobante recibido no es válido.", 400, "FILE_REQUIRED");
    }
    if (!SUPPORTED_FORMATS.has(format)) {
      throw new AppError("Solo se permiten comprobantes JPG o PNG.", 415, "INVALID_FILE_TYPE");
    }

    configure();
    const { folder, publicId } = createAssetLocation(comunidadId, jornadaId);
    const timeout = getTimeout();
    let result;

    try {
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            type: "authenticated",
            asset_folder: folder,
            public_id: publicId,
            overwrite: false,
            use_filename: false,
            unique_filename: false,
            discard_original_filename: true,
            backup: false,
            allowed_formats: ["jpg", "jpeg", "png"],
            headers: ["X-Robots-Tag: noindex"],
            timeout,
          },
          (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult);
          },
        );

        Readable.from([buffer]).pipe(uploadStream);
        uploadStream.once("error", reject);
      });
    } catch {
      // Si el proveedor creó el recurso antes de fallar la respuesta, la limpieza
      // best-effort evita dejar huérfanos sin revelar detalles del proveedor.
      try {
        await destroyImage(publicId);
      } catch {
        // El fallo se registra como deuda operativa; nunca se loguea URL ni credenciales.
      }
      throw new AppError("No se pudo almacenar el comprobante. Intente nuevamente.", 503, "CLOUDINARY_UPLOAD_FAILED");
    }

    const returnedPublicId = result?.public_id;
    let secureUrl;
    try {
      secureUrl = validateSecureAssetUrl(result?.secure_url);
    } catch (error) {
      if (returnedPublicId === publicId) {
        try {
          await destroyImage(publicId);
        } catch {
          // No se expone ni registra el identificador del recurso.
        }
      }
      throw error;
    }
    if (
      !result?.asset_id ||
      returnedPublicId !== publicId ||
      result.resource_type !== "image" ||
      result.type !== "authenticated" ||
      !SUPPORTED_FORMATS.has(result.format) ||
      !Number.isSafeInteger(result.bytes) ||
      result.bytes < 1 ||
      result.bytes > 5 * 1024 * 1024
    ) {
      if (returnedPublicId === publicId) {
        try {
          await destroyImage(publicId);
        } catch {
          // No se expone ni registra el identificador del recurso.
        }
      }
      throw new AppError("Cloudinary devolvió metadatos incompatibles para el comprobante.", 502, "CLOUDINARY_INVALID_RESPONSE");
    }

    return {
      secureUrl,
      publicId,
      assetId: result.asset_id,
      format: result.format,
      resourceType: "image",
      deliveryType: "authenticated",
      size: result.bytes,
    };
  }

  async generatePrivateDownloadUrl({ publicId, format }) {
    if (!SUPPORTED_FORMATS.has(format)) {
      throw new AppError("Formato de comprobante no disponible.", 415, "INVALID_FILE_TYPE");
    }
    configure();
    const expiresAt = Math.floor(Date.now() / 1000) + PRIVATE_DELIVERY_URL_TTL_SECONDS;
    try {
      const url = cloudinary.utils.private_download_url(publicId, format, {
        resource_type: "image",
        type: "authenticated",
        expires_at: expiresAt,
        attachment: true,
      });
      return { url: validateDownloadUrl(url), expiresAt: new Date(expiresAt * 1000) };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("No se pudo generar el acceso temporal al comprobante.", 503, "CLOUDINARY_DOWNLOAD_FAILED");
    }
  }

  async deleteComprobante(publicId) {
    if (typeof publicId !== "string" || !/^comunapp\/bombonas\/[a-z0-9_-]{1,32}\/[a-f\d]{24}\/[a-f\d]{24}\/[0-9a-f-]{36}$/i.test(publicId)) {
      throw new AppError("El identificador del comprobante no es válido.", 400, "INVALID_CLOUDINARY_PUBLIC_ID");
    }
    try {
      return await destroyImage(publicId);
    } catch {
      throw new AppError("Cloudinary no pudo eliminar el comprobante; se reintentará en la siguiente ejecución.", 503, "CLOUDINARY_DELETE_FAILED");
    }
  }
}

export default new CloudinaryService();
