import { z } from 'zod';

export const ROLES = ['admin', 'JEFE_COMUNIDAD', 'LIDER_CALLE'];
const cedulaRegex = /^[VE]-\d{6,9}$/;
const telefonoRegex = /^(0(4(12|14|16|24|26)|2\d{2}))-\d{7}$/;
const objectIdRegex = /^[a-f\d]{24}$/i;

// ── Lógica de negocio: campos requeridos según rol ─────────────────────────────
const rolesValidator = (data, ctx) => {
  if (data.role === 'JEFE_COMUNIDAD' || data.role === 'LIDER_CALLE') {
    if (!data.comunidad) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comunidad'],
        message: 'La comunidad es requerida para los roles JEFE_COMUNIDAD y LIDER_CALLE',
      });
    }
  }
  if (data.role === 'LIDER_CALLE') {
    if (!data.calle || data.calle.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['calle'],
        message: 'La calle es requerida para el rol LIDER_CALLE',
      });
    }
  }
};

export const createUserSchema = z
  .object({
    nombre: z
      .string({ required_error: 'El nombre es requerido' })
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .trim(),
    apellido: z
      .string({ required_error: 'El apellido es requerido' })
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(50, 'El apellido no puede exceder 50 caracteres')
      .trim(),
    cedula: z
      .string({ required_error: 'La cédula es requerida' })
      .regex(cedulaRegex, 'Formato de cédula inválido. Use V-12345678 o E-12345678')
      .trim(),
    email: z
      .string({ required_error: 'El email es requerido' })
      .email('Email no válido')
      .trim()
      .toLowerCase(),
    password: z
      .string({ required_error: 'La contraseña es requerida' })
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.enum(ROLES, {
      required_error: 'El rol es requerido',
      // errorMap: () => ({ message: `El rol debe ser uno de: ${ROLES.join(', ')}` }),
    }),
    telefono: z
      .string()
      .trim()
      .regex(telefonoRegex, 'Formato de teléfono inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX')
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val)),
    direccion: z
      .string()
      .trim()
      .max(200, 'La dirección no puede exceder 200 caracteres')
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val)),
    fechaNacimiento: z
      .string({ required_error: 'La fecha de nacimiento es requerida' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use AAAA-MM-DD')
      .refine((val) => {
        if (!val) return false;
        const birthDate = new Date(val);
        if (isNaN(birthDate.getTime())) return false;
        const age = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        return age >= 18;
      }, 'El usuario debe ser mayor de edad'),
    // Campos de asignación territorial
    comunidad: z
      .string()
      .regex(objectIdRegex, 'ID de comunidad inválido')
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
  })
  .superRefine(rolesValidator);

export const updateUserSchema = createUserSchema
  .innerType()
  .omit({ password: true })
  .partial()
  .extend({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .optional()
      .or(z.literal('')),
    estado: z.enum(['activo', 'inactivo']).optional(),
  })
  .superRefine((data, ctx) => {
    rolesValidator(data, ctx);
  });
