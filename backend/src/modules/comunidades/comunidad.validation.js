import { z } from "zod";

// ── Campos base reutilizables ─────────────────────────────────────────────────

const nombre = z
  .string({ required_error: "El nombre de la comunidad es requerido" })
  .trim()
  .min(1, "El nombre no puede estar vacío")
  .max(100, "El nombre no puede superar 100 caracteres");

const municipio = z
  .string({ required_error: "El municipio es requerido" })
  .trim()
  .min(1, "El municipio no puede estar vacío")
  .max(100, "El municipio no puede superar 100 caracteres");

const estadoGeo = z
  .string({ required_error: "El estado es requerido" })
  .trim()
  .min(1, "El estado no puede estar vacío")
  .max(100, "El estado no puede superar 100 caracteres");

// ── Schemas exportados ────────────────────────────────────────────────────────

/**
 * Creación de comunidad: todos los campos son requeridos.
 */
export const createComunidadSchema = z.object({
  nombre,
  municipio,
  estado: estadoGeo,
});

/**
 * Actualización: todos los campos son opcionales.
 * Se requiere al menos uno.
 */
export const updateComunidadSchema = z
  .object({
    nombre: nombre.optional(),
    municipio: municipio.optional(),
    estado: estadoGeo.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });
