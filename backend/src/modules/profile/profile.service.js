import User from "../users/user.model.js";
import AppError from "../../shared/errors/AppError.js";

class ProfileService {
  /**
   * Obtiene el perfil completo del usuario.
   */
  async getProfile(userId) {
    const user = await User.findById(userId)
      .populate("comunidad", "nombre");

    if (!user) {
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  /**
   * Actualiza los datos editables del perfil del propio usuario.
   */
  async updateProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");
    }

    // Filtrar explícitamente solo los campos permitidos para ser editados por el usuario
    const allowedUpdates = {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      direccion: data.direccion,
      fechaNacimiento: data.fechaNacimiento
    };

    // Remover campos undefined
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    // Si no hay campos para actualizar, lanzar error
    if (Object.keys(allowedUpdates).length === 0) {
      throw new AppError("No hay campos válidos para actualizar.", 400, "NO_UPDATES_PROVIDED");
    }

    Object.assign(user, allowedUpdates);
    await user.save();

    // Devolver el perfil actualizado poblado
    return this.getProfile(userId);
  }

  /**
   * Cambia la contraseña del propio usuario.
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new AppError("Usuario no encontrado.", 404, "USER_NOT_FOUND");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("La contraseña actual es incorrecta.", 400, "INCORRECT_PASSWORD");
    }

    user.password = newPassword;
    await user.save();

    return { message: "Contraseña cambiada exitosamente" };
  }
}

export default new ProfileService();
