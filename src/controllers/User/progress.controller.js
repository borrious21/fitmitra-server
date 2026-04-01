// src/controllers/progress.controller.js
import ProgressModel from "../../models/progress.model.js";
import { validateProgressLog } from "../../validators/progress.validator.js";

class ProgressController {
  static async logProgress(req, res, next) {
    try {
      const body = { ...req.body };

      const numericFields = [
        "weight_kg",
        "body_fat_percentage",
        "energy_level",
        "sleep_hours",
        "water_intake_liters",
        "blood_pressure_systolic",
        "blood_pressure_diastolic",
        "heart_rate",
      ];

      for (const field of numericFields) {
        if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
          const parsed = Number(body[field]);
          body[field] = isNaN(parsed) ? body[field] : parsed;
        } else if (body[field] === "") {
          delete body[field];
        }
      }

      validateProgressLog(body);

      const progress = await ProgressModel.logProgress(req.user.id, body);

      return res.status(201).json({
        success: true,
        message: "Progress logged successfully",
        data: progress,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "VALIDATION_ERROR",
          errors: error.details || [],
        });
      }
      next(error);
    }
  }

  static async getProgressHistory(req, res, next) {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date:   req.query.end_date,
        limit:      Math.min(Math.max(Number(req.query.limit)  || 50, 1), 100),
        offset:     Math.max(Number(req.query.offset) || 0, 0),
      };

      const progress = await ProgressModel.getProgressHistory(req.user.id, filters);

      return res.json({
        success: true,
        count:   progress.length,
        data:    progress,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProgressTrends(req, res, next) {
    try {
      const days   = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
      const trends = await ProgressModel.getProgressTrends(req.user.id, days);
      return res.json({ success: true, data: trends });
    } catch (error) {
      next(error);
    }
  }

  static async getLatestProgress(req, res, next) {
    try {
      const progress = await ProgressModel.getLatestProgress(req.user.id);

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: "No progress logs found",
          code:    "PROGRESS_NOT_FOUND",
        });
      }

      return res.json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProgress(req, res, next) {
    try {
      const progressId = Number(req.params.id);
      if (isNaN(progressId) || progressId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid progress ID",
          code:    "INVALID_PROGRESS_ID",
        });
      }

      const deleted = await ProgressModel.deleteProgress(req.user.id, progressId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Progress log not found",
          code:    "PROGRESS_NOT_FOUND",
        });
      }

      return res.json({ success: true, message: "Progress deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default ProgressController;