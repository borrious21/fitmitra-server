// 

import * as PlansService from "../../services/Admin/plan.service.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

class PlansController {

  static async getAllPlans(req, res, next) {
    try {
      const { limit = 50, offset = 0, is_active } = req.query;
      const activeFilter = is_active === undefined ? null : is_active === "true";
      const data = await PlansService.getAllPlans({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        is_active: activeFilter,
      });
      return response(res, 200, true, "Plans retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async getPlanById(req, res, next) {
    try {
      const plan = await PlansService.getPlanById(req.params.id);
      if (!plan) return response(res, 404, false, "Plan not found");
      return response(res, 200, true, "Plan retrieved", plan);
    } catch (err) { next(err); }
  }

  static async deactivatePlan(req, res, next) {
    try {
      const plan = await PlansService.deactivatePlan(req.params.id);
      if (!plan) return response(res, 404, false, "Plan not found");
      await logAdminAction(req.user.id, "DEACTIVATE_PLAN", { plan_id: req.params.id });
      return response(res, 200, true, "Plan deactivated successfully", plan);
    } catch (err) { next(err); }
  }

  static async deletePlan(req, res, next) {
    try {
      const plan = await PlansService.deletePlan(req.params.id);
      if (!plan) return response(res, 404, false, "Plan not found");
      await logAdminAction(req.user.id, "DELETE_PLAN", { plan_id: req.params.id });
      return response(res, 200, true, "Plan deleted successfully");
    } catch (err) { next(err); }
  }
}

export default PlansController;