import { z } from "zod";

const TELEFONO_REGEX = /^(0(4(12|14|16|24|26)|2\d{2}))-\d{7}$/;

const nombre = z
  .string({ required_error: "El nombre es requerido" })
  .trim()
  .min(1, "El nombre no puede estar vacío")
  .max(50, "El nombre no puede superar 50 caracteres");

const apellido = z
  .string({ required_error: "El apellido es requerido" })
  .trim()
  .min(1, "El apellido no puede estar vacío")
  .max(50, "El apellido no puede superar 50 caracteres");

const fechaNacimiento = z
  .string({ required_error: "La fecha de nacimiento es requerida" })
  .date("Formato de fecha inválido. Use YYYY-MM-DD")
  .refine((val) => {
    const edad = Math.floor(
      (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    return edad >= 18;
  }, "Debe ser mayor de edad (18 años o más)");

const email = z
  .string({ required_error: "El correo electrónico es requerido" })
  .trim()
  .toLowerCase()
  .email("Correo electrónico inválido");

const telefono = z
  .string()
  .trim()
  .regex(TELEFONO_REGEX, "Formato inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

const direccion = z
  .string()
  .trim()
  .max(200, "La dirección no puede superar 200 caracteres")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const updateProfileSchema = z
  .object({
    nombre: nombre.optional(),
    apellido: apellido.optional(),
    email: email.optional(),
    telefono,
    direccion,
    fechaNacimiento: fechaNacimiento.optional(),
  })
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    if (keys.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe enviar al menos un campo para actualizar",
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "La contraseña actual es requerida" })
      .min(1, "La contraseña actual no puede estar vacía"),
    newPassword: z
      .string({ required_error: "La nueva contraseña es requerida" })
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z
      .string({ required_error: "Debe confirmar la nueva contraseña" })
      .min(1, "La confirmación de la contraseña es requerida"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La nueva contraseña y la confirmación no coinciden",
    path: ["confirmPassword"],
  });
