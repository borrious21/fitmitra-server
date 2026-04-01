// controllers/Admin/admin.exercise.controller.js
import * as ExercisesService from "../../services/Admin/exercise.service.js";
import { validateExercise } from "../../validators/admin/exercise.validator.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

class ExercisesController {

  static async getAllExercises(req, res, next) {
    try {
      const { limit = 50, offset = 0, search = "", muscle_group = "", equipment = "" } = req.query;
      const data = await ExercisesService.getAllExercises({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        search,
        muscle_group,
        equipment,
      });
      return response(res, 200, true, "Exercises retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async getExerciseById(req, res, next) {
    try {
      const exercise = await ExercisesService.getExerciseById(req.params.id);
      if (!exercise) return response(res, 404, false, "Exercise not found");
      return response(res, 200, true, "Exercise retrieved", exercise);
    } catch (err) { next(err); }
  }

  // Body shape: { name, muscle_group, equipment, difficulty: "beginner"|"intermediate"|"advanced", contraindications }
  static async createExercise(req, res, next) {
    try {
      validateExercise(req.body, false);
      const exercise = await ExercisesService.createExercise(req.body);
      await logAdminAction(req.user.id, "CREATE_EXERCISE", { exercise_id: exercise.id, name: exercise.name });
      return response(res, 201, true, "Exercise created successfully", exercise);
    } catch (err) {
      if (err.name === "ValidationError") {
        return response(res, 400, false, err.message, { errors: err.details });
      }
      next(err);
    }
  }

  static async updateExercise(req, res, next) {
    try {
      validateExercise(req.body, true);
      const exercise = await ExercisesService.updateExercise(req.params.id, req.body);
      if (!exercise) return response(res, 404, false, "Exercise not found");
      await logAdminAction(req.user.id, "UPDATE_EXERCISE", { exercise_id: Number(req.params.id) });
      return response(res, 200, true, "Exercise updated successfully", exercise);
    } catch (err) {
      if (err.name === "ValidationError") {
        return response(res, 400, false, err.message, { errors: err.details });
      }
      next(err);
    }
  }

  static async deleteExercise(req, res, next) {
    try {
      const exercise = await ExercisesService.deleteExercise(req.params.id);
      if (!exercise) return response(res, 404, false, "Exercise not found");
      await logAdminAction(req.user.id, "DELETE_EXERCISE", { exercise_id: Number(req.params.id) });
      return response(res, 200, true, "Exercise deleted successfully");
    } catch (err) { next(err); }
  }
}

export default ExercisesController;