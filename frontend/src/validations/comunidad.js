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
});

export const updateComunidadSchema = createComunidadSchema.partial();
