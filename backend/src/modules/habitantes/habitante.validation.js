import { z } from "zod";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const CEDULA_REGEX = /^[VE]-\d{6,9}$/i;

// ── Schemas exportados ────────────────────────────────────────────────────────

/**
 * Creación de habitante.
 * - comunidad y calle son tomados del usuario autenticado (LIDER_CALLE),
 *   por lo que NO se envían en el body; el controller los inyecta.
 * - registradoPor también lo inyecta el controller desde req.user.id.
 */
export const createHabitanteSchema = z.object({
  numeroCasa: z
    .string({ required_error: "El número de casa es requerido" })
    .trim()
    .min(1, "El número de casa no puede estar vacío"),

  nombres: z
    .string({ required_error: "Los nombres son requeridos" })
    .trim()
    .min(1, "Los nombres no pueden estar vacíos")
    .max(100, "Los nombres no pueden superar 100 caracteres"),

  apellidos: z
    .string({ required_error: "Los apellidos son requeridos" })
    .trim()
    .min(1, "Los apellidos no pueden estar vacíos")
    .max(100, "Los apellidos no pueden superar 100 caracteres"),

  cedula: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CEDULA_REGEX, "Formato de cédula inválido. Use V-12345678 o E-12345678")
    .nullable()
    .optional(),

  // Sin restricción de mayoría de edad
  fechaNacimiento: z
    .string({ required_error: "La fecha de nacimiento es requerida" })
    .date("Formato de fecha inválido. Use YYYY-MM-DD"),

  jefeFamilia: z.boolean().default(false),

  discapacitado: z
    .string()
    .trim()
    .nullable()
    .optional(),
});

/**
 * Actualización de habitante: todos los campos opcionales.
 */
export const updateHabitanteSchema = z
  .object({
    numeroCasa: z.string().trim().min(1).optional(),
    nombres: z.string().trim().min(1).max(100).optional(),
    apellidos: z.string().trim().min(1).max(100).optional(),
    cedula: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CEDULA_REGEX, "Formato de cédula inválido. Use V-12345678 o E-12345678")
      .nullable()
      .optional(),
    fechaNacimiento: z.string().date("Formato de fecha inválido. Use YYYY-MM-DD").optional(),
    jefeFamilia: z.boolean().optional(),
    discapacitado: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });
