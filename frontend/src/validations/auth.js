import { z } from 'zod';

const CEDULA_REGEX = /^[VvEe]-\d{6,9}$/;
const CEDULA_DIGITS_REGEX = /^\d{6,9}$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'El email o cédula es requerido' })
    .min(1, 'Ingrese su email o cédula')
    .trim()
    .refine(
      (val) => EMAIL_REGEX.test(val) || CEDULA_REGEX.test(val) || CEDULA_DIGITS_REGEX.test(val),
      'Ingrese un email válido, una cédula en formato V-12345678 o solo números'
    ),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

