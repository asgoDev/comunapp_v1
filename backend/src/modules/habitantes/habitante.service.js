import mongoose from "mongoose";
import Habitante from "./habitante.model.js";
import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";

class HabitanteService {
  // ── Helpers privados ──────────────────────────────────────────────────────────

  /**
   * Obtiene el usuario autenticado desde la base de datos con los campos
   * necesarios para aplicar lógica de negocio (role, comunidad, calle).
   *
   * Nota: el JWT solo transporta { id, role }, por eso debemos consultar la BD
   * para obtener comunidad y calle, garantizando datos siempre frescos.
   *
   * @param {string} userId
   * @returns {Promise<{ _id, role, comunidad, calle, estado }>}
   */
  async _getAuthenticatedUser(userId) {
    const user = await User.findById(userId)
      .select("role comunidad calle estado")
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
   * Construye el filtro MongoDB de acceso según el rol del usuario autenticado.
   *
   * - admin        → sin restricción
   * - JEFE_COMUNIDAD → solo su comunidad
   * - LIDER_CALLE  → su comunidad + su calle
   *
   * @param {{ role: string, comunidad: ObjectId, calle: string }} authUser
   * @returns {object} Filtro MongoDB
   */
  _buildFilterByRole(authUser) {
    if (authUser.role === "admin") {
      return {};
    }

    if (authUser.role === "JEFE_COMUNIDAD") {
      return { comunidad: authUser.comunidad };
    }

    // LIDER_CALLE
    return {
      comunidad: authUser.comunidad,
      calle: authUser.calle,
    };
  }

  /**
   * Verifica que el habitante dado pertenezca a la jurisdicción del usuario.
   * Lanza AppError(403) si el usuario no tiene acceso al recurso.
   *
   * @param {object} habitante  Documento plano del habitante
   * @param {object} authUser   Usuario autenticado { role, comunidad, calle }
   */
  _assertOwnership(habitante, authUser) {
    if (authUser.role === "admin") return; // acceso total

    const habitanteComunidadId = habitante.comunidad?._id
      ? habitante.comunidad._id.toString()
      : habitante.comunidad?.toString();

    const userComunidadId = authUser.comunidad?.toString();

    if (habitanteComunidadId !== userComunidadId) {
      throw new AppError(
        "No tiene permisos para acceder a este habitante.",
        403,
        "FORBIDDEN",
      );
    }

    if (authUser.role === "LIDER_CALLE") {
      if (habitante.calle !== authUser.calle) {
        throw new AppError(
          "No tiene permisos para acceder a este habitante.",
          403,
          "FORBIDDEN",
        );
      }
    }
  }

  /**
   * Valida unicidad de cédula dentro de la comunidad.
   * Permite múltiples documentos con cedula = null (habitantes sin cédula).
   * Lanza AppError(409) si ya existe un habitante con la misma cédula no nula.
   *
   * @param {string|null} cedula
   * @param {ObjectId} comunidad
   * @param {string|null} excludeId  ID a excluir (para operaciones de update)
   */
  async _assertCedulaUnique(cedula, comunidad, excludeId = null) {
    if (!cedula) return; // null/undefined → permitido sin validar

    const filter = { cedula, comunidad };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await Habitante.findOne(filter).lean();
    if (existing) {
      throw new AppError(
        `Ya existe un habitante con la cédula "${cedula}" en esta comunidad.`,
        409,
        "HABITANTE_CEDULA_DUPLICATE",
      );
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Crea un nuevo habitante.
   *
   * REGLA DE SEGURIDAD CRÍTICA:
   * Los campos comunidad, calle y registradoPor NUNCA provienen del cliente.
   * Se derivan siempre del usuario autenticado. Cualquier valor enviado
   * desde el frontend para estos campos es descartado e ignorado.
   *
   * Solo LIDER_CALLE puede crear habitantes.
   *
   * @param {object} data           Body validado por Zod (sin comunidad/calle/registradoPor)
   * @param {string} authenticatedUserId
   */
  async create(data, authenticatedUserId) {
    const authUser = await this._getAuthenticatedUser(authenticatedUserId);

    if (authUser.role !== "LIDER_CALLE" && authUser.role !== "admin") {
      throw new AppError(
        "Solo un Líder de Calle o Administrador puede registrar habitantes.",
        403,
        "FORBIDDEN",
      );
    }

    let habitanteData;

    if (authUser.role === "admin") {
      if (!data.comunidad || !data.calle) {
        throw new AppError(
          "La comunidad y la calle son requeridas para el administrador.",
          400,
          "VALIDATION_ERROR",
        );
      }
      habitanteData = {
        ...data,
        registradoPor: authUser._id,
      };
    } else {
      // Descartar campos protegidos del frontend y asignar desde el sistema
      const { comunidad: _c, calle: _ca, registradoPor: _r, ...safeData } = data;
      habitanteData = {
        ...safeData,
        comunidad: authUser.comunidad,
        calle: authUser.calle,
        registradoPor: authUser._id,
      };
    }

    // Validar unicidad de cédula (si viene informada)
    await this._assertCedulaUnique(habitanteData.cedula, habitanteData.comunidad);

    return Habitante.create(habitanteData);
  }

  /**
   * Lista habitantes con paginación y búsqueda, filtrados por rol.
   *
   * Query params:
   *   - page   (default 1)
   *   - limit  (default 20)
   *   - search (busca en nombres, apellidos, cedula — case-insensitive)
   *   - calle  (filtra por calle para admin y JEFE_COMUNIDAD)
   *
   * @param {{ page?, limit?, search?, calle? }} query
   * @param {string} authenticatedUserId
   */
  async getAll({ page = 1, limit = 20, search, calle } = {}, authenticatedUserId) {
    const authUser = await this._getAuthenticatedUser(authenticatedUserId);

    const filter = this._buildFilterByRole(authUser);

    // Búsqueda por nombres, apellidos o cédula
    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { nombres: regex },
        { apellidos: regex },
        { cedula: regex },
      ];
    }

    // Filtro de calle para admin y JEFE_COMUNIDAD
    if (calle && calle.trim()) {
      if (authUser.role !== "LIDER_CALLE") {
        filter.calle = calle.trim();
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [habitantes, total] = await Promise.all([
      Habitante.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .populate("comunidad", "nombre")
        .populate("registradoPor", "nombre apellido")
        .lean(),
      Habitante.countDocuments(filter),
    ]);

    return {
      habitantes,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Obtiene un habitante por su ID.
   * Aplica restricciones de acceso según el rol del usuario autenticado.
   *
   * @param {string} id
   * @param {string} authenticatedUserId
   */
  async getById(id, authenticatedUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de habitante inválido.",
        400,
        "INVALID_HABITANTE_ID",
      );
    }

    const habitante = await Habitante.findById(id)
      .populate("comunidad", "nombre")
      .populate("registradoPor", "nombre apellido")
      .lean();

    if (!habitante) {
      throw new AppError(
        "Habitante no encontrado.",
        404,
        "HABITANTE_NOT_FOUND",
      );
    }

    const authUser = await this._getAuthenticatedUser(authenticatedUserId);
    this._assertOwnership(habitante, authUser);

    return habitante;
  }

  /**
   * Actualiza los datos de un habitante.
   *
   * Restricciones de acceso:
   *   - admin: puede actualizar cualquier habitante
   *   - LIDER_CALLE: solo habitantes de su calle
   *   - JEFE_COMUNIDAD: no puede actualizar (403)
   *
   * Campos protegidos que NO se pueden modificar (se eliminan del body):
   *   - comunidad
   *   - calle
   *   - registradoPor
   *
   * @param {string} id
   * @param {object} data  Body validado por Zod
   * @param {string} authenticatedUserId
   */
  async update(id, data, authenticatedUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de habitante inválido.",
        400,
        "INVALID_HABITANTE_ID",
      );
    }

    const habitante = await Habitante.findById(id);
    if (!habitante) {
      throw new AppError(
        "Habitante no encontrado.",
        404,
        "HABITANTE_NOT_FOUND",
      );
    }

    const authUser = await this._getAuthenticatedUser(authenticatedUserId);

    // JEFE_COMUNIDAD no puede actualizar
    if (authUser.role === "JEFE_COMUNIDAD") {
      throw new AppError(
        "No tiene permisos para actualizar habitantes.",
        403,
        "FORBIDDEN",
      );
    }

    // Verificar jurisdicción (admin pasa; LIDER_CALLE verifica calle)
    this._assertOwnership(habitante.toObject(), authUser);

    // Sanitizar: descartar campos protegidos del sistema
    const { comunidad: _c, calle: _ca, registradoPor: _r, ...safeData } = data;

    // Validar unicidad de cédula si se está modificando
    if (safeData.cedula !== undefined) {
      await this._assertCedulaUnique(
        safeData.cedula,
        habitante.comunidad,
        id,
      );
    }

    Object.assign(habitante, safeData);
    await habitante.save();
    return habitante;
  }

  /**
   * Elimina físicamente un habitante.
   *
   * Restricciones de acceso:
   *   - admin: puede eliminar cualquier habitante
   *   - LIDER_CALLE: puede eliminar habitantes de su propia calle
   *   - JEFE_COMUNIDAD: no puede eliminar
   *
   * @param {string} id
   * @param {string} authenticatedUserId
   */
  /**
   * Carga masiva de habitantes (solo admin).
   *
   * Procesa cada habitante de forma independiente: si uno falla no detiene
   * el lote. Devuelve un resumen con los creados y los que fallaron.
   *
   * Validaciones adicionales:
   *  - Solo admin puede invocar este método.
   *  - Detecta cédulas duplicadas dentro del mismo lote antes de ir a la BD.
   *
   * @param {object[]} habitantesData  Array de objetos ya validados por Zod
   * @param {string}   authenticatedUserId
   * @returns {Promise<{ totalRecibidos, creadosExitosamente, fallidos, errores }>}
   */
  async bulkCreate(habitantesData, authenticatedUserId) {
    const authUser = await this._getAuthenticatedUser(authenticatedUserId);

    if (authUser.role !== "admin") {
      throw new AppError(
        "Solo un Administrador puede realizar cargas masivas.",
        403,
        "FORBIDDEN",
      );
    }

    // Detectar cédulas duplicadas dentro del mismo lote
    const cedulasEnLote = new Map(); // cedula → primer índice donde aparece
    habitantesData.forEach((h, i) => {
      if (h.cedula) {
        const key = `${h.cedula}__${h.comunidad}`;
        if (cedulasEnLote.has(key)) {
          // marcar el duplicado pero seguimos — se reportará como error al procesar
        } else {
          cedulasEnLote.set(key, i);
        }
      }
    });

    const errores = [];
    let creadosExitosamente = 0;

    for (let i = 0; i < habitantesData.length; i++) {
      const data = habitantesData[i];
      try {
        // Verificar si esta cédula ya fue usada en una fila anterior del mismo lote
        if (data.cedula) {
          const key = `${data.cedula}__${data.comunidad}`;
          if (cedulasEnLote.get(key) !== i) {
            throw new Error(
              `Cédula "${data.cedula}" duplicada dentro del lote (ya aparece en la fila ${cedulasEnLote.get(key) + 1}).`,
            );
          }
        }

        // Validar unicidad de cédula contra la BD
        await this._assertCedulaUnique(data.cedula, data.comunidad);

        await Habitante.create({
          ...data,
          registradoPor: authUser._id,
        });

        creadosExitosamente++;
      } catch (err) {
        errores.push({
          fila: i + 1,
          habitante: {
            nombres: data.nombres,
            apellidos: data.apellidos,
            cedula: data.cedula ?? null,
            numeroCasa: data.numeroCasa,
            calle: data.calle,
          },
          error: err.message || "Error desconocido",
        });
      }
    }

    return {
      totalRecibidos: habitantesData.length,
      creadosExitosamente,
      fallidos: errores.length,
      errores,
    };
  }

  async delete(id, authenticatedUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "ID de habitante inválido.",
        400,
        "INVALID_HABITANTE_ID",
      );
    }

    const habitante = await Habitante.findById(id).lean();
    if (!habitante) {
      throw new AppError(
        "Habitante no encontrado.",
        404,
        "HABITANTE_NOT_FOUND",
      );
    }

    const authUser = await this._getAuthenticatedUser(authenticatedUserId);

    // JEFE_COMUNIDAD no puede eliminar
    if (authUser.role === "JEFE_COMUNIDAD") {
      throw new AppError(
        "No tiene permisos para eliminar habitantes.",
        403,
        "FORBIDDEN",
      );
    }

    // Verificar jurisdicción (admin pasa; LIDER_CALLE verifica su calle)
    this._assertOwnership(habitante, authUser);

    await Habitante.findByIdAndDelete(id);
    return habitante;
  }
}

export default new HabitanteService();
