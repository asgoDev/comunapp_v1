import mongoose from "mongoose";

const comunidadSchema = new mongoose.Schema(
  {
    // ── Datos geográficos ──────────────────────────────────────────────────
    nombre: {
      type: String,
      required: [true, "El nombre de la comunidad es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede superar 100 caracteres"],
    },
    municipio: {
      type: String,
      required: [true, "El municipio es requerido"],
      trim: true,
      maxlength: [100, "El municipio no puede superar 100 caracteres"],
    },
    estado: {
      type: String,
      required: [true, "El estado es requerido"],
      trim: true,
      maxlength: [100, "El estado no puede superar 100 caracteres"],
    },
    parroquia: {
      type: String,
      required: [true, "La parroquia es requerida"],
      trim: true,
      maxlength: [100, "La parroquia no puede superar 100 caracteres"],
    },
    ciudadPueblo: {
      type: String,
      required: [true, "La ciudad/pueblo es requerida"],
      trim: true,
      maxlength: [100, "La ciudad/pueblo no puede superar 100 caracteres"],
    },
    circuitoComuna: {
      type: String,
      trim: true,
      maxlength: [100, "El circuito/comuna no puede superar 100 caracteres"],
      default: null,
    },
    // ── Estado lógico ─────────────────────────────────────────────────────────
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Índice de búsqueda frecuente ──────────────────────────────────────────────
comunidadSchema.index({ nombre: 1, municipio: 1, estado: 1, parroquia: 1, ciudadPueblo: 1 });
comunidadSchema.index({ activo: 1, nombre: 1 });

const Comunidad = mongoose.model("Comunidad", comunidadSchema);
export default Comunidad;
