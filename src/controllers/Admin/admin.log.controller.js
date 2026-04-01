// admin/controllers/logsController.js
import * as LogsService from "../../services/Admin/log.service.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

class LogsController {

  static async getWorkoutLogs(req, res, next) {
    try {
      const { limit = 50, offset = 0, user_id, start_date, end_date } = req.query;
      const data = await LogsService.getWorkoutLogs({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        user_id: user_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
      });
      return response(res, 200, true, "Workout logs retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async deleteWorkoutLog(req, res, next) {
    try {
      const log = await LogsService.deleteWorkoutLog(req.params.id);
      if (!log) return response(res, 404, false, "Workout log not found");
      await logAdminAction(req.user.id, "DELETE_WORKOUT_LOG", { log_id: req.params.id });
      return response(res, 200, true, "Workout log deleted successfully");
    } catch (err) { next(err); }
  }

  static async getMealLogs(req, res, next) {
    try {
      const { limit = 50, offset = 0, user_id, start_date, end_date } = req.query;
      const data = await LogsService.getMealLogs({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        user_id: user_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
      });
      return response(res, 200, true, "Meal logs retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async deleteMealLog(req, res, next) {
    try {
      const log = await LogsService.deleteMealLog(req.params.id);
      if (!log) return response(res, 404, false, "Meal log not found");
      await logAdminAction(req.user.id, "DELETE_MEAL_LOG", { log_id: req.params.id });
      return response(res, 200, true, "Meal log deleted successfully");
    } catch (err) { next(err); }
  }

  static async getProgressLogs(req, res, next) {
    try {
      const { limit = 50, offset = 0, user_id } = req.query;
      const data = await LogsService.getProgressLogs({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        user_id: user_id || null,
      });
      return response(res, 200, true, "Progress logs retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async getAdminLogs(req, res, next) {
    try {
      const { limit = 50, offset = 0, admin_id } = req.query;
      const data = await LogsService.getAdminLogs({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        admin_id: admin_id || null,
      });
      return response(res, 200, true, "Admin logs retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }
}

export default LogsController;