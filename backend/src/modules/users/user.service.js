import User from "./user.model.js";
import AppError from "../../shared/errors/AppError.js";
import mongoose from "mongoose";

class UserService {
  /**
   * Obtiene todos los usuarios paginados y filtrados.
   */
  async getUsers({ page = 1, limit = 20, role, estado } = {}, requester) {
    const filter = {};

    if (requester.role === "JEFE_COMUNIDAD") {
      filter.role = "LIDER_CALLE";
      const jefe = await User.findById(requester.id).select("comunidad").lean();
      if (!jefe || !jefe.comunidad) {
        throw new AppError("El jefe de comunidad no tiene una comunidad asignada.", 403, "FORBIDDEN");
      }
      filter.comunidad = jefe.comunidad;
    } else {
      if (role) filter.role = role;
    }

    if (estado) filter.estado = estado;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Obtiene un usuario por ID.
   */
  async getUserById(id, requester) {
    const user = await User.findById(id);
    if (!user)
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");

    if (requester.role === "JEFE_COMUNIDAD") {
      const jefe = await User.findById(requester.id).select("comunidad").lean();
      if (
        user.role !== "LIDER_CALLE" ||
        user.comunidad?.toString() !== jefe?.comunidad?.toString()
      ) {
        throw new AppError("No tiene permisos para ver este usuario.", 403, "FORBIDDEN");
      }
    }
    return user;
  }

  /**
   * Crea un nuevo usuario.
   */
  async createUser(data, requester) {
    if (requester.role === "JEFE_COMUNIDAD") {
      const jefe = await User.findById(requester.id).select("comunidad").lean();
      if (!jefe || !jefe.comunidad) {
        throw new AppError("El jefe de comunidad no tiene una comunidad asignada.", 403, "FORBIDDEN");
      }
      data.role = "LIDER_CALLE";
      data.comunidad = jefe.comunidad;
    }
    return User.create(data);
  }

  /**
   * Actualiza un usuario existente.
   */
  async updateUser(id, data, requester) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("ID de usuario inválido o no provisto.", 400, "INVALID_USER_ID");
    }
    const user = await User.findById(id).select("+password");
    if (!user)
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");

    if (requester.role === "JEFE_COMUNIDAD") {
      const jefe = await User.findById(requester.id).select("comunidad").lean();
      if (
        user.role !== "LIDER_CALLE" ||
        user.comunidad?.toString() !== jefe?.comunidad?.toString()
      ) {
        throw new AppError("No tiene permisos para modificar este usuario.", 403, "FORBIDDEN");
      }
      data.role = "LIDER_CALLE";
      data.comunidad = jefe.comunidad;
    }

    Object.assign(user, data);
    await user.save();
    return user;
  }

  /**
   * Desactiva un usuario (soft delete).
   */
  async deleteUser(id, currentUserId, requester) {
    if (id === currentUserId.toString()) {
      throw new AppError(
        "No puede desactivar su propia cuenta.",
        400,
        "SELF_DEACTIVATION",
      );
    }

    const userToDeactivate = await User.findById(id);
    if (!userToDeactivate)
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");

    if (requester.role === "JEFE_COMUNIDAD") {
      const jefe = await User.findById(requester.id).select("comunidad").lean();
      if (
        userToDeactivate.role !== "LIDER_CALLE" ||
        userToDeactivate.comunidad?.toString() !== jefe?.comunidad?.toString()
      ) {
        throw new AppError("No tiene permisos para desactivar este usuario.", 403, "FORBIDDEN");
      }
    }

    userToDeactivate.estado = "inactivo";
    await userToDeactivate.save();
    return userToDeactivate;
  }
}

export default new UserService();
