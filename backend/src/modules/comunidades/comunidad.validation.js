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

const parroquia = z
  .string({ required_error: "La parroquia es requerida" })
  .trim()
  .min(1, "La parroquia no puede estar vacía")
  .max(100, "La parroquia no puede superar 100 caracteres");

const ciudadPueblo = z
  .string({ required_error: "La ciudad/pueblo es requerida" })
  .trim()
  .min(1, "La ciudad/pueblo no puede estar vacía")
  .max(100, "La ciudad/pueblo no puede superar 100 caracteres");

const circuitoComuna = z
  .string()
  .trim()
  .max(100, "El circuito/comuna no puede superar 100 caracteres")
  .optional();

// ── Schemas exportados ────────────────────────────────────────────────────────

/**
 * Creación de comunidad: todos los campos son requeridos.
 */
export const createComunidadSchema = z.object({
  nombre,
  municipio,
  estado: estadoGeo,
  parroquia,
  ciudadPueblo,
  circuitoComuna,
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
    parroquia: parroquia.optional(),
    ciudadPueblo: ciudadPueblo.optional(),
    circuitoComuna,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });
