import { z } from 'zod';

const telefonoRegex = /^(0(4(12|14|16|24|26)|2\d{2}))-\d{7}$/;

export const updateProfileSchema = z.object({
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
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email no válido')
    .trim()
    .toLowerCase(),
  telefono: z
    .string()
    .trim()
    .regex(telefonoRegex, 'Formato de teléfono inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  direccion: z
    .string()
    .trim()
    .max(200, 'La dirección no puede exceder 200 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
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
    }, 'Debe ser mayor de edad (18 años o más)'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'La contraseña actual es requerida' })
      .min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string({ required_error: 'La nueva contraseña es requerida' })
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z
      .string({ required_error: 'Debe confirmar la nueva contraseña' })
      .min(1, 'Debe confirmar la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'La nueva contraseña y la confirmación no coinciden',
    path: ['confirmPassword'],
  });
