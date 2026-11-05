import mongoose from "mongoose";

const jornadaBombonaSchema = new mongoose.Schema(
  {
    comunidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comunidad",
      required: true,
      index: true,
    },
    creadaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    preciosCentavos: {
      grande: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
      mediana: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
      pequena: { type: Number, required: true, min: 1, max: Number.MAX_SAFE_INTEGER },
    },
    pagoMovil: {
      banco: { type: String, required: true, trim: true, maxlength: 60 },
      telefono: { type: String, required: true, trim: true },
      documento: { type: String, required: true, trim: true, uppercase: true },
      titular: { type: String, required: true, trim: true, maxlength: 120 },
    },
    activa: { type: Boolean, default: true, required: true },
    fechaCierre: { type: Date, default: null },
    cerradaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    motivoCierre: { type: String, trim: true, maxlength: 300, default: null },
    pagosRegistrados: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

// Solo puede existir una jornada activa por comunidad, incluso ante carreras.
jornadaBombonaSchema.index(
  { comunidad: 1 },
  {
    unique: true,
    partialFilterExpression: { activa: true },
    name: "una_jornada_bombonas_activa_por_comunidad",
  },
);
jornadaBombonaSchema.index({ comunidad: 1, createdAt: -1 });

const JornadaBombona = mongoose.model("JornadaBombona", jornadaBombonaSchema);
export default JornadaBombona;
