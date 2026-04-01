// admin/controllers/analyticsController.js
import * as AnalyticsService from "../../services/Admin/analytic.service.js";
import response from "../../utils/response.util.js";

class AnalyticsController {

  static async getOverview(req, res, next) {
    try {
      const overview = await AnalyticsService.getPlatformOverview();
      return response(res, 200, true, "Platform overview retrieved", overview);
    } catch (err) { next(err); }
  }

  static async getUserStats(req, res, next) {
    try {
      const stats = await AnalyticsService.getUserStats();
      return response(res, 200, true, "User stats retrieved", stats);
    } catch (err) { next(err); }
  }

  static async getWorkoutStats(req, res, next) {
    try {
      const stats = await AnalyticsService.getWorkoutStats();
      return response(res, 200, true, "Workout stats retrieved", stats);
    } catch (err) { next(err); }
  }

  static async getMealStats(req, res, next) {
    try {
      const stats = await AnalyticsService.getMealStats();
      return response(res, 200, true, "Meal stats retrieved", stats);
    } catch (err) { next(err); }
  }

  static async getRetentionStats(req, res, next) {
    try {
      const stats = await AnalyticsService.getRetentionStats();
      return response(res, 200, true, "Retention stats retrieved", stats);
    } catch (err) { next(err); }
  }

  static async getAtRiskUsers(req, res, next) {
    try {
      const users = await AnalyticsService.getAtRiskUsers();
      return response(res, 200, true, "At-risk users retrieved", { users, count: users.length });
    } catch (err) { next(err); }
  }

  static async getTopActiveUsers(req, res, next) {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const users = await AnalyticsService.getTopActiveUsers(limit);
      return response(res, 200, true, "Top active users retrieved", { users, count: users.length });
    } catch (err) { next(err); }
  }
}

export default AnalyticsController;