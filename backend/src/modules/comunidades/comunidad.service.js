import mongoose from "mongoose";
import Comunidad from "./comunidad.model.js";
import Habitante from "../habitantes/habitante.model.js";
import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";

class ComunidadService {
  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Verifica si existe una comunidad activa con el mismo nombre + municipio + estado.
   * @param {string} nombre
   * @param {string} municipio
   * @param {string} estado
   * @param {string|null} excludeId  ID a excluir de la búsqueda (útil en update).
   * @returns {Promise<boolean>}
   */
  async existsByName(nombre, municipio, estado, excludeId = null) {
    const filter = {
      nombre: { $regex: `^${nombre.trim()}$`, $options: "i" },
      municipio: { $regex: `^${municipio.trim()}$`, $options: "i" },
      estado: { $regex: `^${estado.trim()}$`, $options: "i" },
      activo: true,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const existing = await Comunidad.findOne(filter).lean();
    return !!existing;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Crea una nueva comunidad.
   * Valida que no exista otra activa con el mismo nombre + municipio + estado.
   */
  async create(data) {
    const { nombre, municipio, estado } = data;

    const duplicate = await this.existsByName(nombre, municipio, estado);
    if (duplicate) {
      throw new AppError(
        `Ya existe una comunidad llamada "${nombre}" en ${municipio}, ${estado}.`,
        409,
        "COMUNIDAD_DUPLICATE",
      );
    }

    return Comunidad.create(data);
  }

  /**
   * Lista todas las comunidades activas con paginación.
   */
  async getAll({ page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);

    const [comunidades, total] = await Promise.all([
      Comunidad.find({ activo: true })
        .skip(skip)
        .limit(Number(limit))
        .sort({ nombre: 1 })
        .lean(),
      Comunidad.countDocuments({ activo: true }),
    ]);

    return {
      comunidades,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Obtiene una comunidad activa por su ID.
   * Lanza 404 si no existe o está inactiva.
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const comunidad = await Comunidad.findOne({ _id: id, activo: true }).lean();
    if (!comunidad) {
      throw new AppError(
        "Comunidad no encontrada.",
        404,
        "COMUNIDAD_NOT_FOUND",
      );
    }

    return comunidad;
  }

  /**
   * Actualiza los campos de una comunidad.
   * Valida existencia y evita duplicados con otras comunidades.
   */
  async update(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const comunidad = await Comunidad.findOne({ _id: id, activo: true });
    if (!comunidad) {
      throw new AppError(
        "Comunidad no encontrada.",
        404,
        "COMUNIDAD_NOT_FOUND",
      );
    }

    // Verificar duplicados sólo si hay campos que puedan crear conflicto
    const nombre = data.nombre ?? comunidad.nombre;
    const municipio = data.municipio ?? comunidad.municipio;
    const estado = data.estado ?? comunidad.estado;

    const duplicate = await this.existsByName(nombre, municipio, estado, id);
    if (duplicate) {
      throw new AppError(
        `Ya existe una comunidad llamada "${nombre}" en ${municipio}, ${estado}.`,
        409,
        "COMUNIDAD_DUPLICATE",
      );
    }

    Object.assign(comunidad, data);
    await comunidad.save();
    return comunidad;
  }

  /**
   * Soft delete: marca la comunidad como inactiva.
   */
  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const comunidad = await Comunidad.findOneAndUpdate(
      { _id: id, activo: true },
      { activo: false },
      { new: true },
    );

    if (!comunidad) {
      throw new AppError(
        "Comunidad no encontrada.",
        404,
        "COMUNIDAD_NOT_FOUND",
      );
    }

    return comunidad;
  }

  // ── Estadísticas ─────────────────────────────────────────────────────────────

  /**
   * Retorna un resumen de la comunidad:
   * jefes de comunidad, líderes de calle, total de habitantes y jefes de familia.
   */
  async getSummary(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const comunidad = await Comunidad.findOne({ _id: id, activo: true })
      .select("nombre")
      .lean();

    if (!comunidad) {
      throw new AppError(
        "Comunidad no encontrada.",
        404,
        "COMUNIDAD_NOT_FOUND",
      );
    }

    const objectId = new mongoose.Types.ObjectId(id);

    const [jefesComunidad, lideresCalle, habitantes, jefesFamilia] =
      await Promise.all([
        User.countDocuments({
          comunidad: objectId,
          role: "JEFE_COMUNIDAD",
          estado: "activo",
        }),
        User.countDocuments({
          comunidad: objectId,
          role: "LIDER_CALLE",
          estado: "activo",
        }),
        Habitante.countDocuments({ comunidad: objectId }),
        Habitante.countDocuments({ comunidad: objectId, jefeFamilia: true }),
      ]);

    return {
      comunidad: comunidad.nombre,
      jefesComunidad,
      lideresCalle,
      habitantes,
      jefesFamilia,
    };
  }
}

export default new ComunidadService();
