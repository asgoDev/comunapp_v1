import mongoose from "mongoose";
import Comunidad from "./comunidad.model.js";
import Habitante from "../habitantes/habitante.model.js";
import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";

class ComunidadService {
  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Relee al usuario autenticado para aplicar scoping con datos frescos.
   * El JWT solo transporta { id, role }; comunidad y estado deben venir de la BD.
   *
   * @param {string} userId
   * @returns {Promise<{ _id, role, comunidad, estado }>}
   */
  async _getAuthenticatedUser(userId) {
    const user = await User.findById(userId)
      .select("role comunidad estado")
      .lean();

    if (!user || user.estado === "inactivo") {
      throw new AppError(
        "Usuario autenticado no encontrado o inactivo.",
        401,
        "USER_NOT_FOUND",
      );
    }

    return user;
  }

  /**
   * Construye el filtro de lectura de comunidades según el rol.
   * Un jefe sin comunidad asignada no puede listar el catálogo global.
   *
   * @param {{ role: string, comunidad: object }} authUser
   * @returns {object}
   */
  _buildReadFilter(authUser) {
    if (authUser.role === "admin") {
      return { activo: true };
    }

    if (authUser.role === "JEFE_COMUNIDAD") {
      if (!authUser.comunidad) {
        throw new AppError(
          "El usuario no tiene una comunidad asignada.",
          403,
          "FORBIDDEN",
        );
      }

      return { _id: authUser.comunidad, activo: true };
    }

    throw new AppError(
      "No tiene permisos para acceder a comunidades.",
      403,
      "FORBIDDEN",
    );
  }

  /**
   * Verifica que la comunidad pertenezca al ámbito del usuario autenticado.
   * ADMIN tiene acceso global; JEFE_COMUNIDAD solo a la suya.
   *
   * @param {object} comunidad Documento plano de la comunidad
   * @param {{ role: string, comunidad: object }} authUser
   */
  _assertOwnership(comunidad, authUser) {
    if (authUser.role === "admin") return;

    const comunidadId = comunidad._id?.toString();
    const userComunidadId = authUser.comunidad?.toString();

    if (!userComunidadId || comunidadId !== userComunidadId) {
      throw new AppError(
        "No tiene permisos para acceder a esta comunidad.",
        403,
        "FORBIDDEN",
      );
    }
  }

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
   * Lista las comunidades activas visibles para el usuario autenticado.
   * ADMIN ve todas; JEFE_COMUNIDAD solo la suya.
   *
   * @param {{ page?: number, limit?: number }} options
   * @param {string} authenticatedUserId
   */
  async getAll({ page = 1, limit = 20 } = {}, authenticatedUserId) {
    const authUser = await this._getAuthenticatedUser(authenticatedUserId);
    const filter = this._buildReadFilter(authUser);
    const skip = (Number(page) - 1) * Number(limit);

    const [comunidades, total] = await Promise.all([
      Comunidad.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ nombre: 1 })
        .lean(),
      Comunidad.countDocuments(filter),
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
   * Obtiene una comunidad activa dentro del ámbito del usuario autenticado.
   * Lanza 404 si no existe o está inactiva, y 403 si pertenece a otra comunidad.
   *
   * @param {string} id
   * @param {string} authenticatedUserId
   */
  async getById(id, authenticatedUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const authUser = await this._getAuthenticatedUser(authenticatedUserId);
    const comunidad = await Comunidad.findOne({ _id: id, activo: true }).lean();
    if (!comunidad) {
      throw new AppError(
        "Comunidad no encontrada.",
        404,
        "COMUNIDAD_NOT_FOUND",
      );
    }

    this._assertOwnership(comunidad, authUser);
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
   * Retorna un resumen de la comunidad dentro del ámbito del usuario:
   * jefes de comunidad, líderes de calle, total de habitantes y jefes de familia.
   *
   * @param {string} id
   * @param {string} authenticatedUserId
   */
  async getSummary(id, authenticatedUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de comunidad inválido.",
        400,
        "INVALID_COMUNIDAD_ID",
      );
    }

    const authUser = await this._getAuthenticatedUser(authenticatedUserId);
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

    // Verificar propiedad antes de calcular o exponer cualquier conteo.
    this._assertOwnership(comunidad, authUser);

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
