import { z } from "zod";
import { ROLES } from "../users/user.model.js";

const CEDULA_REGEX = /^[VvEe]-\d{6,9}$/;
const TELEFONO_REGEX = /^(0(4(12|14|16|24|26)|2\d{2}))-\d{7}$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

// ── Campos base reutilizables ─────────────────────────────────────────────────

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

const cedula = z
  .string({ required_error: "La cédula es requerida" })
  .trim()
  .toUpperCase()
  .regex(
    CEDULA_REGEX,
    "Formato de cédula inválido. Use V-12345678 o E-12345678",
  );

const fechaNacimiento = z
  .string({ required_error: "La fecha de nacimiento es requerida" })
  .date("Formato de fecha inválido. Use YYYY-MM-DD")
  .refine((val) => {
    const edad = Math.floor(
      (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    return edad >= 18;
  }, "El usuario debe ser mayor de edad");

const email = z
  .string({ required_error: "El correo electrónico es requerido" })
  .trim()
  .toLowerCase()
  .email("Correo electrónico inválido");

const password = z
  .string({ required_error: "La contraseña es requerida" })
  .min(8, "La contraseña debe tener al menos 8 caracteres");

const role = z.enum(ROLES, {
  errorMap: () => ({ message: `El rol debe ser uno de: ${ROLES.join(", ")}` }),
});

const estado = z.enum(["activo", "inactivo"], {
  errorMap: () => ({ message: "El estado debe ser activo o inactivo" }),
});

const telefono = z
  .string()
  .trim()
  .regex(TELEFONO_REGEX, "Formato inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX")
  .nullable()
  .optional();

const direccion = z
  .string()
  .trim()
  .max(200, "La dirección no puede superar 200 caracteres")
  .nullable()
  .optional();

const comunidad = z
  .string()
  .regex(OBJECT_ID_REGEX, "ID de comunidad inválido")
  .nullable()
  .optional();

const calle = z
  .string()
  .trim()
  .min(1, "La calle no puede estar vacía")
  .nullable()
  .optional();

// ── Schemas exportados ─────────────────────────────────────────────────────────

/**
 * Validación de negocio: comunidad y calle según el rol.
 */
const rolesValidator = (data, ctx) => {
  if (
    data.role === "JEFE_COMUNIDAD" ||
    data.role === "LIDER_CALLE"
  ) {
    if (!data.comunidad) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comunidad"],
        message: "La comunidad es requerida para los roles JEFE_COMUNIDAD y LIDER_CALLE",
      });
    }
  }
  if (data.role === "LIDER_CALLE") {
    if (!data.calle || data.calle.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["calle"],
        message: "La calle es requerida para el rol LIDER_CALLE",
      });
    }
  }
};

/**
 * Creación: todos los campos obligatorios requeridos.
 */
export const createUserSchema = z
  .object({
    nombre,
    apellido,
    cedula,
    fechaNacimiento,
    email,
    password,
    role,
    telefono,
    direccion,
    estado: estado.optional(),
    comunidad,
    calle,
  })
  .superRefine(rolesValidator);

/**
 * Actualización: todos los campos opcionales.
 * No se permite cambiar la cédula una vez creado el usuario.
 * El password pasa por el pre-save hook de Mongoose si se envía.
 */
export const updateUserSchema = z
  .object({
    nombre: nombre.optional(),
    apellido: apellido.optional(),
    fechaNacimiento: fechaNacimiento.optional(),
    email: email.optional(),
    password: password.optional(),
    role: role.optional(),
    telefono,
    direccion,
    estado: estado.optional(),
    comunidad,
    calle,
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).filter(k => data[k] !== undefined).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe enviar al menos un campo para actualizar",
      });
    }
    rolesValidator(data, ctx);
  });
