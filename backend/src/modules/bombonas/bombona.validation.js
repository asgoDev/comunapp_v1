import { z } from "zod";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const TELEFONO_VE_REGEX = /^(0(4(12|14|16|22|24|26)|2\d{2}))-\d{7}$/;
const DOCUMENTO_REGEX = /^[VE]-\d{6,9}$/i;
const NUMERO_CASA_REGEX = /^\d{1,8}$/;

const objectId = z.string().regex(OBJECT_ID_REGEX, "ID inválido");

const precio = z
  .number({ required_error: "El precio es requerido", invalid_type_error: "El precio debe ser numérico" })
  .finite()
  .positive("El precio debe ser mayor que cero")
  .max(50_000_000, "El precio supera el máximo permitido")
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "El precio admite máximo dos decimales");

const textoNombre = z
  .string({ required_error: "El nombre es requerido" })
  .trim()
  .min(2, "Debe contener al menos 2 caracteres")
  .max(120, "No puede superar 120 caracteres")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, "Contiene caracteres no permitidos");

export const idParamSchema = z.object({ id: objectId }).strict();
export const comunidadParamSchema = z.object({ comunidadId: objectId }).strict();

export const createJornadaSchema = z
  .object({
    comunidad: objectId.optional(),
    precios: z
      .object({ grande: precio, mediana: precio, pequena: precio })
      .strict(),
    pagoMovil: z
      .object({
        banco: z
          .string({ required_error: "El banco es requerido" })
          .trim()
          .min(2)
          .max(60)
          .regex(/^[\p{L}\p{M}0-9 .'-]+$/u, "Nombre de banco inválido"),
        telefono: z.string().trim().regex(TELEFONO_VE_REGEX, "Use el formato 04XX-XXXXXXX o 02XX-XXXXXXX"),
        documento: z.string().trim().toUpperCase().regex(DOCUMENTO_REGEX, "Use V-12345678 o E-12345678"),
        titular: textoNombre,
      })
      .strict(),
  })
  .strict();

export const createPublicPaymentSchema = z
  .object({
    numeroCasa: z.string().trim().regex(NUMERO_CASA_REGEX, "El número de casa debe contener solo dígitos"),
    propietario: textoNombre,
    referencia: z
      .string()
      .trim()
      .toUpperCase()
      .min(4)
      .max(40)
      .regex(/^[A-Z0-9-]+$/, "Use solo letras, números y guiones en la referencia"),
    bombonasGrande: z.coerce.number().int().min(0).max(10),
    bombonasMediana: z.coerce.number().int().min(0).max(10),
    bombonasPequena: z.coerce.number().int().min(0).max(10),
    website: z.string().max(0, "Solicitud inválida").optional().default(""),
  })
  .strict()
  .refine(
    ({ bombonasGrande, bombonasMediana, bombonasPequena }) =>
      bombonasGrande + bombonasMediana + bombonasPequena > 0,
    { message: "Debe solicitar al menos una bombona", path: ["bombonasGrande"] },
  )
  .refine(
    ({ bombonasGrande, bombonasMediana, bombonasPequena }) =>
      bombonasGrande + bombonasMediana + bombonasPequena <= 20,
    { message: "No puede solicitar más de 20 bombonas por jornada", path: ["bombonasGrande"] },
  );

export const listJornadasQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    comunidadId: objectId.optional(),
    activa: z.enum(["true", "false"]).optional(),
  })
  .strict();

export const listPagosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    comunidadId: objectId.optional(),
    jornadaId: objectId.optional(),
    estado: z.enum(["pendiente", "verificado", "rechazado"]).optional(),
    search: z.string().trim().max(80).optional(),
  })
  .strict();

export const reviewPagoSchema = z
  .object({
    estado: z.enum(["verificado", "rechazado"]),
    motivoRechazo: z.string().trim().min(5).max(500).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.estado === "rechazado" && !data.motivoRechazo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoRechazo"],
        message: "El motivo es obligatorio al rechazar un pago",
      });
    }
    if (data.estado === "verificado" && data.motivoRechazo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoRechazo"],
        message: "No se permite motivo de rechazo al verificar un pago",
      });
    }
  });

export const closeJornadaSchema = z
  .object({ motivo: z.string().trim().min(5).max(300).optional() })
  .strict()
  .default({});
