import { z } from 'zod';

export const createComunidadSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre de la comunidad es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  municipio: z
    .string({ required_error: 'El municipio es requerido' })
    .min(1, 'El municipio no puede estar vacío')
    .max(100, 'El municipio no puede exceder 100 caracteres')
    .trim(),
  estado: z
    .string({ required_error: 'El estado es requerido' })
    .min(1, 'El estado no puede estar vacío')
    .max(100, 'El estado no puede exceder 100 caracteres')
    .trim(),
  parroquia: z
    .string({ required_error: 'La parroquia es requerida' })
    .min(1, 'La parroquia no puede estar vacía')
    .max(100, 'La parroquia no puede exceder 100 caracteres')
    .trim(),
  ciudadPueblo: z
    .string({ required_error: 'La ciudad/pueblo es requerida' })
    .min(1, 'La ciudad/pueblo no puede estar vacía')
    .max(100, 'La ciudad/pueblo no puede exceder 100 caracteres')
    .trim(),
  circuitoComuna: z
    .string()
    .max(100, 'El circuito/comuna no puede exceder 100 caracteres')
    .trim()
    .optional(),
});

export const updateComunidadSchema = createComunidadSchema.partial();
