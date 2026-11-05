import mongoose from "mongoose";

const comprobanteSchema = new mongoose.Schema(
  {
    contentType: { type: String, required: true, enum: ["image/jpeg", "image/png", "application/pdf"] },
    size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    contenido: { type: Buffer, required: true, select: false },
  },
  { _id: false },
);

const pagoBombonaSchema = new mongoose.Schema(
  {
    jornada: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JornadaBombona",
      required: true,
      index: true,
    },
    comunidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comunidad",
      required: true,
      index: true,
    },
    codigoSeguimiento: { type: String, required: true, unique: true, immutable: true },
    numeroCasa: { type: String, required: true, trim: true, match: /^\d{1,8}$/ },
    propietario: { type: String, required: true, trim: true, maxlength: 120 },
    referencia: { type: String, required: true, trim: true, maxlength: 40 },
    referenciaNormalizada: { type: String, required: true, trim: true, maxlength: 40 },
    bombonas: {
      grande: { type: Number, required: true, min: 0, max: 10 },
      mediana: { type: Number, required: true, min: 0, max: 10 },
      pequena: { type: Number, required: true, min: 0, max: 10 },
    },
    preciosCentavos: {
      grande: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
      mediana: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
      pequena: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
    },
    totalCentavos: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
    estado: {
      type: String,
      enum: ["pendiente", "verificado", "rechazado"],
      default: "pendiente",
      required: true,
      index: true,
    },
    revisadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fechaRevision: { type: Date, default: null },
    motivoRechazo: { type: String, trim: true, maxlength: 500, default: null },
    idempotencyKeyHash: { type: String, required: true, select: false },
    requestHash: { type: String, required: true, select: false },
    comprobante: { type: comprobanteSchema, required: true },
    origen: { type: String, enum: ["PUBLICO"], default: "PUBLICO", immutable: true },
  },
  { timestamps: true, versionKey: false },
);

// La clave no se reutiliza dentro de una comunidad, aunque la jornada cierre.
pagoBombonaSchema.index(
  { comunidad: 1, idempotencyKeyHash: 1 },
  { unique: true, name: "idempotencia_pago_por_comunidad" },
);
pagoBombonaSchema.index(
  { jornada: 1, referenciaNormalizada: 1 },
  { unique: true, name: "referencia_unica_por_jornada" },
);
pagoBombonaSchema.index({ comunidad: 1, estado: 1, createdAt: -1 });
pagoBombonaSchema.index({ jornada: 1, estado: 1, createdAt: -1 });

const PagoBombona = mongoose.model("PagoBombona", pagoBombonaSchema);
export default PagoBombona;
