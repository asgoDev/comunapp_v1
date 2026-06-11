import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'El email o cédula es requerido' })
    .min(1, 'Ingrese su email o cédula')
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
