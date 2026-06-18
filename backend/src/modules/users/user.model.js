import mongoose from "mongoose";
import bcrypt from "bcrypt";

// ── Roles disponibles ─────────────────────────────────────────────────────────
export const ROLES = ["admin", "JEFE_COMUNIDAD", "LIDER_CALLE"];

/**
 * Teléfono venezolano: prefijos fijos (0212, 0261…) o celulares (04XX-XXXXXXX).
 * Formato esperado: 04XX-XXXXXXX  |  02XX-XXXXXXX
 */
const TELEFONO_VE_REGEX = /^(0(4(12|14|16|22|24|26)|2\d{2}))-\d{7}$/;

const userSchema = new mongoose.Schema(
  {
    // ── Identidad ─────────────────────────────────────────────────────────
    nombre: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      maxlength: [50, "El nombre no puede superar 50 caracteres"],
    },
    apellido: {
      type: String,
      required: [true, "El apellido es requerido"],
      trim: true,
      maxlength: [50, "El apellido no puede superar 50 caracteres"],
    },
    cedula: {
      type: String,
      required: [true, "La cédula es requerida"],
      unique: true,
      trim: true,
      uppercase: true, // normalizar siempre a mayúsculas antes de guardar
      match: [
        /^[VE]-\d{6,9}$/,
        "Formato de cédula inválido. Use V-12345678 o E-12345678",
      ],
    },
    fechaNacimiento: {
      type: Date,
      required: [true, "La fecha de nacimiento es requerida"],
    },

    // ── Acceso ────────────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: `El rol debe ser uno de: ${ROLES.join(", ")}`,
      },
      required: [true, "El rol es requerido"],
    },

    // ── Comunidad y Calle (requeridos según rol) ───────────────────────────
    comunidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comunidad",
      validate: {
        validator: function (value) {
          // JEFE_COMUNIDAD y LIDER_CALLE requieren comunidad
          if (
            this.role === "JEFE_COMUNIDAD" ||
            this.role === "LIDER_CALLE"
          ) {
            return !!value;
          }
          return true;
        },
        message:
          "La comunidad es requerida para los roles JEFE_COMUNIDAD y LIDER_CALLE",
      },
    },
    calle: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          // LIDER_CALLE requiere calle
          if (this.role === "LIDER_CALLE") {
            return !!value && value.trim().length > 0;
          }
          return true;
        },
        message: "La calle es requerida para el rol LIDER_CALLE",
      },
    },
    estado: {
      type: String,
      enum: {
        values: ["activo", "inactivo"],
        message: "El estado debe ser activo o inactivo",
      },
      default: "activo",
    },

    // ── Contacto ──────────────────────────────────────────────────────────
    email: {
      type: String,
      required: [true, "El correo electrónico es requerido"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo electrónico inválido"],
    },
    telefono: {
      type: String,
      trim: true,
      default: null,
      match: [
        TELEFONO_VE_REGEX,
        "Formato de teléfono inválido. Use 04XX-XXXXXXX o 02XX-XXXXXXX",
      ],
    },
    direccion: {
      type: String,
      trim: true,
      maxlength: [200, "La dirección no puede superar 200 caracteres"],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Índice compuesto para búsquedas frecuentes ────────────────────────────────
userSchema.index({ estado: 1, role: 1 });
userSchema.index({ comunidad: 1, calle: 1 });

// ── Hash del password antes de guardar ───────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Comparar password ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Excluir password del JSON de respuesta ────────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model("User", userSchema);
export default User;
