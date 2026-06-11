import { z } from 'zod';

export const ROLES = ['admin', 'user'];
const cedulaRegex = /^[VE]-\d{6,9}$/;

export const createUserSchema = z.object({
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
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(ROLES, {
    errorMap: () => ({ message: `El rol debe ser uno de: ${ROLES.join(', ')}` }),
  }),
  telefono: z
    .string({ required_error: 'El telefono es requerido' })
    .trim()
    .max(25, 'El teléfono no puede exceder 25 caracteres')
    .or(z.literal('')),
  direccion: z
    .string()
    .trim()
    .max(250, 'La dirección no puede exceder 250 caracteres')
    .optional()
    .or(z.literal('')),
  cargo: z
    .string()
    .trim()
    .max(100, 'El cargo no puede exceder 100 caracteres')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? 'Usuario' : val)
    .default('Usuario'),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use AAAA-MM-DD')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .optional()
      .or(z.literal('')),
    estado: z.enum(['activo', 'inactivo']).optional(),
  });
