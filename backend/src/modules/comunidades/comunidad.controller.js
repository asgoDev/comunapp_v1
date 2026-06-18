import comunidadService from "./comunidad.service.js";

class ComunidadController {
  /**
   * POST /api/comunidades
   * Solo ADMIN.
   */
  async createComunidad(req, res, next) {
    try {
      const comunidad = await comunidadService.create(req.body);
      res.status(201).json({ message: "Comunidad creada exitosamente.", comunidad });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/comunidades
   * ADMIN y JEFE_COMUNIDAD.
   */
  async getComunidades(req, res, next) {
    try {
      const result = await comunidadService.getAll(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/comunidades/:id
   * ADMIN y JEFE_COMUNIDAD.
   */
  async getComunidad(req, res, next) {
    try {
      const comunidad = await comunidadService.getById(req.params.id);
      res.json(comunidad);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/comunidades/:id
   * Solo ADMIN.
   */
  async updateComunidad(req, res, next) {
    try {
      const comunidad = await comunidadService.update(req.params.id, req.body);
      res.json({ message: "Comunidad actualizada exitosamente.", comunidad });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/comunidades/:id
   * Solo ADMIN. Soft delete.
   */
  async deleteComunidad(req, res, next) {
    try {
      const comunidad = await comunidadService.delete(req.params.id);
      res.json({ message: "Comunidad desactivada exitosamente.", comunidad });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/comunidades/:id/resumen
   * ADMIN y JEFE_COMUNIDAD.
   */
  async getComunidadResumen(req, res, next) {
    try {
      const resumen = await comunidadService.getSummary(req.params.id);
      res.json(resumen);
    } catch (error) {
      next(error);
    }
  }
}

export default new ComunidadController();
