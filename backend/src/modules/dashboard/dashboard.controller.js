import dashboardService from './dashboard.service.js';

class DashboardController {
    /**
     * GET /api/dashboard/stats
     */
    async getStats(req, res, next) {
        try {
            const stats = await dashboardService.getStats(req.user);
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }
}

export default new DashboardController();
