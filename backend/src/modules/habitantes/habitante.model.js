import mongoose from "mongoose";

/**
 * Teléfono venezolano: prefijos fijos (0212, 0261…) o celulares (04XX-XXXXXXX).
 * Formato esperado: 04XX-XXXXXXX  |  02XX-XXXXXXX
 */
const TELEFONO_VE_REGEX = /^(0(4(12|14|16|22|24|26)|2\d{2}))-\d{7}$/;

const habitanteSchema = new mongoose.Schema(
  {
    // ── Vivienda ───────────────────────────────────────────────────────────
    numeroCasa: {
      type: String,
      required: [true, "El número de casa es requerido"],
      trim: true,
    },
    calle: {
      type: String,
      required: [true, "La calle es requerida"],
      trim: true,
    },

    // ── Identidad ──────────────────────────────────────────────────────────
    nombres: {
      type: String,
      required: [true, "Los nombres son requeridos"],
      lowercase: true,
      trim: true,
      maxlength: [100, "Los nombres no pueden superar 100 caracteres"],
    },
    apellidos: {
      type: String,
      required: [true, "Los apellidos son requeridos"],
      trim: true,
      lowercase: true,
      maxlength: [100, "Los apellidos no pueden superar 100 caracteres"],
    },
    cedula: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    fechaNacimiento: {
      type: Date,
      default: null,
    },

    // ── Datos adicionales ──────────────────────────────────────────────────
    jefeFamilia: {
      type: Boolean,
      required: [true, "El campo jefeFamilia es requerido"],
      default: false,
    },
    discapacitado: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Contacto ──────────────────────────────────────────────────────────
    telefono: {
      type: String,
      trim: true,
      default: null,
      match: [
        TELEFONO_VE_REGEX,
        "Formato de teléfono inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX",
      ],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo electrónico inválido"],
    },

    // ── Relaciones ─────────────────────────────────────────────────────────
    comunidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comunidad",
      required: [true, "La comunidad es requerida"],
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El campo registradoPor es requerido"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Índices de búsqueda frecuente ─────────────────────────────────────────────
habitanteSchema.index({ comunidad: 1, calle: 1 });
habitanteSchema.index({ cedula: 1 }, { sparse: true });
habitanteSchema.index({ registradoPor: 1 });

const Habitante = mongoose.model("Habitante", habitanteSchema);
export default Habitante;
