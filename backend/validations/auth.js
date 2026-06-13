import { z } from 'zod';

const CEDULA_REGEX = /^[VvEe]-\d{6,9}$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * loginSchema
 *
 * El identifier puede ser email o cédula (V-XXXXXXX / E-XXXXXXX).
 * La validación del formato ocurre aquí, en la capa de validación,
 * no en el servicio — así el query de Mongo nunca recibe un valor malformado.
 */
export const loginSchema = z.object({
    identifier: z
        .string({ required_error: 'El email o cédula es requerido' })
        .min(1, 'Ingrese su email o cédula')
        .trim()
        .refine(
            (val) => EMAIL_REGEX.test(val) || CEDULA_REGEX.test(val),
            'Ingrese un email válido o una cédula en formato V-1234567'
        ),
    password: z
        .string({ required_error: 'La contraseña es requerida' })
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
