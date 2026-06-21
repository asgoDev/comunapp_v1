import profileService from "./profile.service.js";

class ProfileController {
  /**
   * GET /api/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await profileService.getProfile(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/profile
   */
  async updateProfile(req, res, next) {
    try {
      const user = await profileService.updateProfile(req.user.id, req.body);
      res.json({ message: "Perfil actualizado exitosamente", user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/profile/password
   */
  async changePassword(req, res, next) {
    try {
      const result = await profileService.changePassword(req.user.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProfileController();
