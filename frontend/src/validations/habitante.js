import { z } from 'zod';

const cedulaRegex = /^[VE]-\d{6,9}$/i;
const telefonoRegex = /^(0(4(12|14|16|24|26)|2\d{2}))-\d{7}$/;

export const createHabitanteSchema = z.object({
  numeroCasa: z
    .string({ required_error: 'El número de casa es requerido' })
    .min(1, 'El número de casa no puede estar vacío')
    .trim(),

  nombres: z
    .string({ required_error: 'Los nombres son requeridos' })
    .min(1, 'Los nombres no pueden estar vacíos')
    .max(100, 'Los nombres no pueden exceder 100 caracteres')
    .trim(),

  apellidos: z
    .string({ required_error: 'Los apellidos son requeridos' })
    .min(1, 'Los apellidos no pueden estar vacíos')
    .max(100, 'Los apellidos no pueden exceder 100 caracteres')
    .trim(),

  cedula: z
    .string()
    .trim()
    .toUpperCase()
    .regex(cedulaRegex, 'Formato de cédula inválido. Use V-12345678 o E-12345678')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),

  // Sin restricción de edad mínima
  fechaNacimiento: z
    .string({ required_error: 'La fecha de nacimiento es requerida' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use AAAA-MM-DD')
    .refine((val) => {
      if (!val) return false;
      return !isNaN(new Date(val).getTime());
    }, 'Fecha de nacimiento inválida'),

  jefeFamilia: z.boolean().default(false),

  discapacitado: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),

  telefono: z
    .string()
    .trim()
    .regex(telefonoRegex, 'Formato de teléfono inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),

  email: z
    .string()
    .trim()
    .email('Correo electrónico inválido')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),

  comunidad: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ID de comunidad inválido')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),

  calle: z
    .string()
    .trim()
    .min(1, 'La calle no puede estar vacía')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
});

export const updateHabitanteSchema = createHabitanteSchema.partial();
