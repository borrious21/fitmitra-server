// controllers/Admin/admin.dashboard.controller.js
import {
  getPlatformOverview,
  getPopularWorkouts,
  getUserGrowth,
  getGoalDistribution,
} from "../../services/Admin/analytic.service.js";
import pool from "../../config/db.config.js";
import response from "../../utils/response.util.js";

class DashboardController {
  static async getStats(req, res, next) {
    try {
      const [overview, popularWorkouts, userGrowth, goalDist, recentUsersRes] = await Promise.all([
        getPlatformOverview(),
        getPopularWorkouts(8),
        getUserGrowth(),
        getGoalDistribution(),
        pool.query(
          `SELECT u.id, u.name, u.email, u.role, u.is_verified, u.created_at, up.avatar_url
           FROM users u
           LEFT JOIN user_preferences up ON up.user_id = u.id
           ORDER BY u.created_at DESC LIMIT 5`
        ),
      ]);

      return response(res, 200, true, "Dashboard stats retrieved", {
        overview,
        popular_workouts:  popularWorkouts,
        user_growth:       userGrowth,
        goal_distribution: goalDist,
        recent_users:      recentUsersRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default DashboardController;