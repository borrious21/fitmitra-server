// src/controllers/meal.controller.js

import {
  logMealService,
  getMealLogsService,
  getMealLogsByDateService,
  getDailySummaryService,
  getRangeSummaryService,
  updateMealLogService,
  deleteMealLogService,
  getMealLogByIdService,
  deleteMealLogsByDateService,
  getDailySummary,
  getWeeklySummary,
  MealLogServiceError,
} from "../../services/meal.service.js";

const NOT_FOUND_CODES = new Set(["MEAL_NOT_FOUND", "LOG_NOT_FOUND"]);

const handleServiceError = (error, res, context) => {
  if (error instanceof MealLogServiceError) {
    const status = NOT_FOUND_CODES.has(error.code) ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message, code: error.code });
  }
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
};

export const logMeal = async (req, res) => {
  try {
    const mealLog = await logMealService(req.user.id, req.body);
    res.status(201).json({ success: true, message: "Meal logged successfully", data: mealLog });
  } catch (error) {
    handleServiceError(error, res, "logMeal");
  }
};

export const getMealLogs = async (req, res) => {
  try {
    const result = await getMealLogsService(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    handleServiceError(error, res, "getMealLogs");
  }
};

export const getMealLogById = async (req, res) => {
  try {
    const log = await getMealLogByIdService(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    handleServiceError(error, res, "getMealLogById");
  }
};

export const getMealLogsByDate = async (req, res) => {
  try {
    const logs = await getMealLogsByDateService(req.user.id, req.params.date);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    handleServiceError(error, res, "getMealLogsByDate");
  }
};

export const updateMealLog = async (req, res) => {
  try {
    const updatedLog = await updateMealLogService(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, message: "Meal log updated successfully", data: updatedLog });
  } catch (error) {
    handleServiceError(error, res, "updateMealLog");
  }
};

export const deleteMealLog = async (req, res) => {
  try {
    await deleteMealLogService(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: "Meal log deleted successfully" });
  } catch (error) {
    handleServiceError(error, res, "deleteMealLog");
  }
};

export const deleteMealLogsByDate = async (req, res) => {
  try {
    const deleted = await deleteMealLogsByDateService(req.user.id, req.params.date);
    res.status(200).json({
      success: true,
      message: `${deleted.length} meal log(s) deleted successfully`,
      data: { count: deleted.length },
    });
  } catch (error) {
    handleServiceError(error, res, "deleteMealLogsByDate");
  }
};

export const getDailySummaryController = async (req, res) => {
  try {
    const summary = await getDailySummaryService(req.user.id, req.params.date);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleServiceError(error, res, "getDailySummary");
  }
};

export const getRangeSummaryController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await getRangeSummaryService(req.user.id, startDate, endDate);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleServiceError(error, res, "getRangeSummary");
  }
};

export const getMealSummaryDaily = async (req, res, next) => {
  try {
    const result = await getDailySummary(req.user.id, req.query.date);
    res.status(200).json({ success: true, message: "Daily meal summary generated", data: result });
  } catch (error) {
    next(error);
  }
};

export const getMealSummaryWeekly = async (req, res, next) => {
  try {
    const result = await getWeeklySummary(req.user.id, req.query.week);
    res.status(200).json({ success: true, message: "Weekly meal summary generated", data: result });
  } catch (error) {
    next(error);
  }
};

export default {
  logMeal,
  getMealLogs,
  getMealLogById,
  getMealLogsByDate,
  updateMealLog,
  deleteMealLog,
  deleteMealLogsByDate,
  // Summaries
  getDailySummaryController,
  getRangeSummaryController,
  getMealSummaryDaily,
  getMealSummaryWeekly,
};