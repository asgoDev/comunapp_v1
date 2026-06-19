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

  /**
   * POST /api/habitantes/bulk
   * Solo ADMIN.
   * Carga masiva: procesa todos los habitants del lote y devuelve un resumen
   * indicando cuántos se crearon y cuáles fallaron (con su motivo).
   * Responde 201 si todos OK, 207 si hubo errores parciales.
   */
  async bulkCreateHabitantes(req, res, next) {
    try {
      const resultado = await habitanteService.bulkCreate(
        req.body.habitantes,
        req.user.id,
      );

      const statusCode = resultado.fallidos > 0 ? 207 : 201;
      res.status(statusCode).json({
        message:
          resultado.fallidos === 0
            ? `${resultado.creadosExitosamente} habitantes cargados exitosamente.`
            : `Carga parcial: ${resultado.creadosExitosamente} creados, ${resultado.fallidos} con errores.`,
        ...resultado,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new HabitanteController();
