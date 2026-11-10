import { z } from 'zod';

const OBJECT_ID = /^[a-f\d]{24}$/i;
const TELEFONO_VE = /^(0(4(12|14|16|22|24|26)|2\d{2}))-\d{7}$/;
const DOCUMENTO = /^[VE]-\d{6,9}$/i;
const NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const BANCO = /^[\p{L}\p{M}0-9 .'-]+$/u;

const precio = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isNaN(value)) return undefined;
    return value;
  },
  z
    .number({
      required_error: 'El precio es requerido',
      invalid_type_error: 'El precio debe ser numérico',
    })
    .finite()
    .positive('El precio debe ser mayor que cero')
    .max(50_000_000, 'El precio supera el máximo permitido')
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      'El precio admite máximo dos decimales',
    ),
);

const nombreTitular = z
  .string({ required_error: 'El titular es requerido' })
  .trim()
  .min(2, 'El titular debe tener al menos 2 caracteres')
  .max(120, 'El titular no puede superar 120 caracteres')
  .regex(NOMBRE, 'El titular contiene caracteres no permitidos');

export const crearJornadaSchema = z
  .object({
    comunidad: z.string().regex(OBJECT_ID, 'ID de comunidad inválido').optional(),
    precios: z
      .object({
        grande: precio,
        mediana: precio,
        pequena: precio,
      })
      .strict(),
    pagoMovil: z
      .object({
        banco: z
          .string({ required_error: 'El banco es requerido' })
          .trim()
          .min(2, 'El banco debe tener al menos 2 caracteres')
          .max(60, 'El banco no puede superar 60 caracteres')
          .regex(BANCO, 'Nombre de banco inválido'),
        telefono: z
          .string({ required_error: 'El teléfono es requerido' })
          .trim()
          .regex(TELEFONO_VE, 'Use el formato 04XX-XXXXXXX o 02XX-XXXXXXX'),
        documento: z
          .string({ required_error: 'El documento es requerido' })
          .trim()
          .toUpperCase()
          .regex(DOCUMENTO, 'Use V-12345678 o E-12345678'),
        titular: nombreTitular,
      })
      .strict(),
  })
  .strict();

const motivoOpcional = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(300, 'El motivo no puede superar 300 caracteres')
    .optional(),
);

export const cerrarJornadaSchema = z
  .object({
    motivo: motivoOpcional,
  })
  .strict();

export const rechazarPagoSchema = z
  .object({
    motivoRechazo: z
      .string({ required_error: 'El motivo es obligatorio' })
      .trim()
      .min(5, 'El motivo es obligatorio y debe tener al menos 5 caracteres')
      .max(500, 'El motivo no puede superar 500 caracteres'),
  })
  .strict();
