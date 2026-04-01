// src/controllers/admin/admin.meal.controller.js
import * as MealsService from "../../services/Admin/meal.service.js";
import { validateMeal } from "../../validators/admin/meal.validator.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

class MealsController {

  static async getAllMeals(req, res, next) {
    try {
      const {
        limit    = 50,
        offset   = 0,
        search   = "",
        diet_type = "",
        tag      = "",   
      } = req.query;

      const data = await MealsService.getAllMeals({
        limit:     Math.min(Number(limit), 100),
        offset:    Number(offset),
        search,
        diet_type,
        tag,             
      });

      return response(res, 200, true, "Meals retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async getMealById(req, res, next) {
    try {
      const meal = await MealsService.getMealById(req.params.id);
      if (!meal) return response(res, 404, false, "Meal not found");
      return response(res, 200, true, "Meal retrieved", meal);
    } catch (err) { next(err); }
  }

  static async createMeal(req, res, next) {
    try {
      validateMeal(req.body, false);
      const meal = await MealsService.createMeal(req.body);
      await logAdminAction(req.user.id, "CREATE_MEAL", { meal_id: meal.id, name: meal.name });
      return response(res, 201, true, "Meal created successfully", meal);
    } catch (err) {
      if (err.name === "ValidationError")
        return response(res, 400, false, err.message, { errors: err.details });
      next(err);
    }
  }

  static async updateMeal(req, res, next) {
    try {
      validateMeal(req.body, true);
      const meal = await MealsService.updateMeal(req.params.id, req.body);
      if (!meal) return response(res, 404, false, "Meal not found");
      await logAdminAction(req.user.id, "UPDATE_MEAL", { meal_id: Number(req.params.id) });
      return response(res, 200, true, "Meal updated successfully", meal);
    } catch (err) {
      if (err.name === "ValidationError")
        return response(res, 400, false, err.message, { errors: err.details });
      next(err);
    }
  }

  static async deleteMeal(req, res, next) {
    try {
      const meal = await MealsService.deleteMeal(req.params.id);
      if (!meal) return response(res, 404, false, "Meal not found");
      await logAdminAction(req.user.id, "DELETE_MEAL", { meal_id: Number(req.params.id) });
      return response(res, 200, true, "Meal deleted successfully");
    } catch (err) { next(err); }
  }
}

export default MealsController;