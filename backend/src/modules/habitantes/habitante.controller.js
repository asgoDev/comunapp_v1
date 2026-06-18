import habitanteService from "./habitante.service.js";

class HabitanteController {
  /**
   * POST /api/habitantes
   * Solo LIDER_CALLE.
   * comunidad, calle y registradoPor son inyectados por el servicio
   * a partir del usuario autenticado — nunca del body del cliente.
   */
  async createHabitante(req, res, next) {
    try {
      const habitante = await habitanteService.create(req.body, req.user.id);
      res
        .status(201)
        .json({ message: "Habitante registrado exitosamente.", habitante });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/habitantes
   * ADMIN, JEFE_COMUNIDAD y LIDER_CALLE (cada uno con su filtro de acceso).
   * Soporta paginación (?page=1&limit=20) y búsqueda (?search=...).
   */
  async getHabitantes(req, res, next) {
    try {
      const result = await habitanteService.getAll(req.query, req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/habitantes/:id
   * ADMIN, JEFE_COMUNIDAD y LIDER_CALLE (con restricciones de jurisdicción).
   */
  async getHabitante(req, res, next) {
    try {
      const habitante = await habitanteService.getById(
        req.params.id,
        req.user.id,
      );
      res.json(habitante);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/habitantes/:id
   * ADMIN y LIDER_CALLE (JEFE_COMUNIDAD no puede actualizar).
   * Los campos comunidad, calle y registradoPor son ignorados del body.
   */
  async updateHabitante(req, res, next) {
    try {
      const habitante = await habitanteService.update(
        req.params.id,
        req.body,
        req.user.id,
      );
      res.json({ message: "Habitante actualizado exitosamente.", habitante });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/habitantes/:id
   * ADMIN (cualquier habitante) y LIDER_CALLE (solo su calle).
   * Eliminación física.
   */
  async deleteHabitante(req, res, next) {
    try {
      const habitante = await habitanteService.delete(
        req.params.id,
        req.user.id,
      );
      res.json({ message: "Habitante eliminado exitosamente.", habitante });
    } catch (error) {
      next(error);
    }
  }
}

export default new HabitanteController();
