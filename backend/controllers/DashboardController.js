import dashboardService from '../services/DashboardService.js';

class DashboardController {
    /**
     * GET /api/dashboard/stats
     */
    async getStats(req, res, next) {
        try {
            const stats = await dashboardService.getStats();
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }
}

export default new DashboardController();
