import { z } from 'zod';

const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'application/pdf'];

export const pagoBombonasSchema = z.object({
  numeroCasa: z
    .string({ required_error: 'Seleccione el número de casa' })
    .min(1, 'Seleccione el número de casa'),

  propietario: z
    .string({ required_error: 'El nombre del propietario es requerido' })
    .trim()
    .min(2, 'Ingrese el nombre del propietario')
    .max(120, 'El nombre no puede exceder 120 caracteres'),

  referencia: z
    .string({ required_error: 'El número de referencia es requerido' })
    .trim()
    .min(4, 'Ingrese un número de referencia válido')
    .max(40, 'La referencia no puede exceder 40 caracteres')
    .regex(/^[a-zA-Z0-9-]+$/, 'Use únicamente letras, números y guiones'),

  comprobante: z
    .any()
    .refine((files) => files?.length === 1, 'Cargue el comprobante de pago')
    .refine(
      (files) => !files?.length || files[0].size <= MAX_COMPROBANTE_BYTES,
      'El comprobante no puede superar 5 MB'
    )
    .refine(
      (files) => !files?.length || TIPOS_COMPROBANTE.includes(files[0].type),
      'El comprobante debe ser JPG, PNG o PDF'
    ),

  bombonas: z
    .object({
      grande: z.number().int().min(0),
      mediana: z.number().int().min(0),
      pequena: z.number().int().min(0),
    })
    .refine(
      ({ grande, mediana, pequena }) => grande + mediana + pequena > 0,
      'Seleccione al menos una bombona'
    ),
});
