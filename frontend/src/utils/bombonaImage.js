export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MAX_SIDE = 1600;

const readCompressionQuality = () => {
  const configured = Number(import.meta.env.VITE_BOMBONAS_IMAGE_QUALITY);
  if (!Number.isFinite(configured)) return DEFAULT_QUALITY;
  return Math.min(0.92, Math.max(0.5, configured));
};

const readMaxSide = () => {
  const configured = Number(import.meta.env.VITE_BOMBONAS_IMAGE_MAX_SIDE);
  if (!Number.isFinite(configured)) return DEFAULT_MAX_SIDE;
  return Math.round(Math.min(2400, Math.max(800, configured)));
};

const throwImageError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  throw error;
};

const validateImageFile = async (file) => {
  if (!(file instanceof Blob) || !['image/jpeg', 'image/png'].includes(file.type)) {
    throwImageError('INVALID_FILE_TYPE', 'El comprobante debe ser una imagen JPG o PNG. HEIC y PDF no están permitidos.');
  }
  if (file.size === 0) {
    throwImageError('FILE_REQUIRED', 'El archivo seleccionado está vacío.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throwImageError('FILE_TOO_LARGE', 'La imagen original no puede superar 15 MB.');
  }

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isJpeg = file.type === 'image/jpeg' && header.length >= 3 &&
    header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const isPng = file.type === 'image/png' && pngSignature.every((byte, index) => header[index] === byte);

  if (!isJpeg && !isPng) {
    throwImageError('INVALID_FILE_SIGNATURE', 'El contenido del archivo no coincide con una imagen JPG o PNG válida.');
  }
};

const createFile = (blob, type, lastModified = Date.now()) => {
  const extension = type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `comprobante.${extension}`, { type, lastModified });
};

const canvasToJpeg = (canvas, quality) =>
  new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('El navegador no pudo procesar la imagen.'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', quality);
    } catch (error) {
      reject(error);
    }
  });

const originalFileForUpload = (file) => createFile(file, file.type, file.lastModified);

/**
 * Re-codifica la imagen en el navegador (createImageBitmap aplica orientación EXIF
 * según el soporte del navegador) y nunca supera el tamaño máximo del API.
 */
export async function comprimirComprobante(file) {
  await validateImageFile(file);

  let bitmap;
  let canvas;
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
      throw new Error('El navegador no ofrece procesamiento de imágenes.');
    }
    bitmap = await createImageBitmap(file);
    const maxSide = readMaxSide();
    let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    let quality = readCompressionQuality();
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('No se pudo preparar el procesamiento de la imagen.');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const compressedBlob = await canvasToJpeg(canvas, quality);
      if (compressedBlob.size === 0) {
        throw new Error('El navegador generó una imagen vacía.');
      }
      if (compressedBlob.size <= MAX_COMPROBANTE_BYTES) {
        if (compressedBlob.size >= file.size && file.size <= MAX_COMPROBANTE_BYTES) {
          return {
            file: originalFileForUpload(file),
            optimized: false,
            originalSize: file.size,
            uploadSize: file.size,
          };
        }
        const compressedFile = createFile(compressedBlob, 'image/jpeg');
        return {
          file: compressedFile,
          optimized: true,
          originalSize: file.size,
          uploadSize: compressedFile.size,
        };
      }

      if (quality > 0.52) {
        quality = Math.max(0.5, quality - 0.08);
      } else {
        scale *= 0.82;
      }
    }

    if (file.size <= MAX_COMPROBANTE_BYTES) {
      return {
        file: originalFileForUpload(file),
        optimized: false,
        originalSize: file.size,
        uploadSize: file.size,
      };
    }
    throwImageError('FILE_TOO_LARGE', 'No se pudo reducir la imagen por debajo de 5 MB. Seleccione una imagen más pequeña.');
  } catch (error) {
    if (error.code) throw error;
    if (file.size <= MAX_COMPROBANTE_BYTES) {
      return {
        file: originalFileForUpload(file),
        optimized: false,
        originalSize: file.size,
        uploadSize: file.size,
        warning: 'No se pudo optimizar; se enviará la imagen original.',
      };
    }
    throwImageError('IMAGE_COMPRESSION_FAILED', 'No se pudo optimizar la imagen. Intente con otra JPG o PNG de hasta 5 MB.');
  } finally {
    if (bitmap?.close) bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
