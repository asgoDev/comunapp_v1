import { z } from 'zod';

const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png'];

const fileSchema = z
  .custom(
    (file) => typeof Blob !== 'undefined' && file instanceof Blob &&
      typeof file.name === 'string' && typeof file.lastModified === 'number',
    'Cargue un comprobante de pago',
  )
  .refine((file) => file.size > 0, 'El comprobante está vacío')
  .refine((file) => file.size <= MAX_COMPROBANTE_BYTES, 'El comprobante no puede superar 5 MB')
  .refine((file) => TIPOS_COMPROBANTE.includes(file.type), 'El comprobante debe ser JPG o PNG');

const nombre = z
  .string({ required_error: 'El nombre del propietario es requerido' })
  .trim()
  .min(2, 'Ingrese el nombre del propietario')
  .max(120, 'El nombre no puede exceder 120 caracteres')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, 'El nombre contiene caracteres no permitidos');

export const pagoBombonasSchema = z
  .object({
    calle: z
      .string({ required_error: 'Seleccione una calle' })
      .trim()
      .min(1, 'Seleccione una calle')
      .max(120, 'El nombre de la calle no puede superar 120 caracteres'),
    numeroCasa: z
      .string({ required_error: 'Seleccione el número de casa' })
      .trim()
      .regex(/^\d{1,8}$/, 'El número de casa debe contener solo dígitos'),
    propietario: nombre,
    referencia: z
      .string({ required_error: 'El número de referencia es requerido' })
      .trim()
      .toUpperCase()
      .min(4, 'Ingrese un número de referencia válido')
      .max(40, 'La referencia no puede exceder 40 caracteres')
      .regex(/^[A-Z0-9-]+$/, 'Use únicamente letras, números y guiones'),
    comprobante: fileSchema,
    bombonas: z
      .object({
        grande: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        mediana: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        pequena: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      })
      .strict()
      .refine(
        ({ grande, mediana, pequena }) => grande + mediana + pequena > 0,
        'Seleccione al menos una bombona',
      ),
  })
  .strict();
