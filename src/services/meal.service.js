// src/services/meal.service.js

import PlanModel from "../models/plan.model.js";
import MealModel, { MealLogModel } from "../models/meal.model.js";
import { NEPALI_FOODS } from "../rules/nepaliFoods.data.js";

export class MealLogServiceError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "MealLogServiceError";
    this.code = code;
  }
}

const extractConditions = (medical_conditions) => {
  if (!medical_conditions) return [];
  if (Array.isArray(medical_conditions)) return medical_conditions;
  if (typeof medical_conditions === "object") {
    return Object.keys(medical_conditions).filter((k) => Boolean(medical_conditions[k]));
  }
  return [];
};

const isVegetarianProfile = (profile) => {
  const dietPreference =
    profile?.diet_preference ||
    profile?.dietPreference ||
    profile?.food_preference ||
    profile?.foodPreference;

  if (!dietPreference) return false;
  return String(dietPreference).toLowerCase().includes("veg");
};

const shouldExcludeFood = ({ food, conditions, goal, vegetarian }) => {
  if (conditions.includes("diabetes") && food.tags.includes("high_carb")) return true;
  if (conditions.includes("heart_disease") && food.tags.includes("high_fat")) return true;
  if (goal === "weight_loss" && food.tags.includes("high_fat")) return true;
  if (vegetarian && !food.tags.includes("vegetarian")) return true;
  return false;
};

const scoreFood = ({ food, conditions, goal }) => {
  let score = 0;
  if (conditions.includes("diabetes") && food.tags.includes("diabetes_friendly")) score += 3;
  if (conditions.includes("heart_disease") && food.tags.includes("heart_friendly")) score += 3;
  if (goal === "weight_loss" && food.tags.includes("high_protein")) score += 2;
  if (goal === "muscle_gain" && food.tags.includes("high_protein")) score += 3;
  if (food.tags.includes("balanced")) score += 1;
  if (food.tags.includes("light")) score += 1;
  return score;
};

export const suggestMealsForProfile = (profile, calculateMealWiseMacros) => {
  const mealMacros = calculateMealWiseMacros(profile);
  if (!mealMacros) return null;

  const conditions = extractConditions(profile.medical_conditions);
  const goal = profile.goal ? String(profile.goal).toLowerCase() : "";
  const vegetarian = isVegetarianProfile(profile);

  const pickForMeal = (mealName) => {
    const foodList = NEPALI_FOODS[mealName] || [];

    return foodList
      .filter((food) => !shouldExcludeFood({ food, conditions, goal, vegetarian }))
      .map((food) => ({ food, score: scoreFood({ food, conditions, goal }) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.food)
      .slice(0, 2);
  };

  return {
    meta: {
      conditions,
      goal: goal || null,
      vegetarian,
      meal_macros: mealMacros,
    },
    suggestions: {
      breakfast: pickForMeal("breakfast"),
      lunch: pickForMeal("lunch"),
      dinner: pickForMeal("dinner"),
    },
  };
};

const isValidISODate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const getDailySummary = async (userId, date) => {
  const logDate = date ?? new Date().toISOString().slice(0, 10);

  if (!isValidISODate(logDate)) {
    const error = new Error("Invalid date format. Use YYYY-MM-DD");
    error.statusCode = 400;
    throw error;
  }

  const activePlan = await PlanModel.getActivePlanByUser(userId);
  const totals = await MealLogModel.getDailyTotals(userId, logDate);
  const byMealType = await MealLogModel.getDailyByMealType(userId, logDate);

  return {
    date: logDate,
    plan: activePlan
      ? { plan_id: activePlan.id, week: totals?.week ?? null }
      : null,
    totals: totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    byMealType,
  };
};

export const getWeeklySummary = async (userId, weekParam) => {
  const activePlan = await PlanModel.getActivePlanByUser(userId);

  if (!activePlan) {
    const error = new Error("No active plan found for weekly summary.");
    error.statusCode = 400;
    throw error;
  }

  const week = weekParam ? Number(weekParam) : null;

  if (!week || Number.isNaN(week) || week < 1) {
    const error = new Error("Invalid week. Provide a positive week number.");
    error.statusCode = 400;
    throw error;
  }

  const totals = await MealLogModel.getWeeklyTotals(userId, activePlan.id, week);
  const perDay = await MealLogModel.getWeeklyPerDay(userId, activePlan.id, week);

  return {
    plan_id: activePlan.id,
    week,
    totals: totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    perDay,
  };
};

export const logMealService = async (userId, payload) => {
  try {
    if (!userId || isNaN(userId)) {
      throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    }

    const { mealType, source, mealId, mealName, calories, protein, carbs, fats, notes, log_date } = payload;

    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    const normalizedMealType = mealType?.toString().trim().toLowerCase();
    if (!normalizedMealType || !validMealTypes.includes(normalizedMealType)) {
      throw new MealLogServiceError(
        `Invalid meal type. Must be one of: ${validMealTypes.join(", ")}`,
        "INVALID_MEAL_TYPE"
      );
    }

    const validSources = ["custom", "database", "api", "search", "ai_planner"];
    const normalizedSource = source?.toString().trim().toLowerCase();
    if (!normalizedSource || !validSources.includes(normalizedSource)) {
      throw new MealLogServiceError(
        `Invalid source. Must be one of: ${validSources.join(", ")}`,
        "INVALID_SOURCE"
      );
    }

    if (!mealName || !mealName.toString().trim()) {
      throw new MealLogServiceError("Meal name is required", "MEAL_NAME_REQUIRED");
    }

    const activePlan = await PlanModel.getActivePlanByUser(userId);
    let planId = null;
    let week = null;

    if (activePlan) {
      planId = activePlan.id;
      const planStart = new Date(activePlan.generated_at);
      const consumedAt = log_date ? new Date(log_date) : new Date();
      week = Math.max(1, Math.ceil((consumedAt - planStart) / (7 * 24 * 60 * 60 * 1000)));
    }

    const caloriesNum = Number(calories);
    const proteinG = Number(protein || 0);
    const carbsG = Number(carbs || 0);
    const fatsG = Number(fats || 0);

    if (isNaN(caloriesNum) || caloriesNum < 0) {
      throw new MealLogServiceError("Calories must be a non-negative number", "INVALID_CALORIES");
    }
    if (proteinG < 0 || carbsG < 0 || fatsG < 0) {
      throw new MealLogServiceError("Nutrition values must be non-negative", "INVALID_NUTRITION_VALUES");
    }

    if (mealId) {
      const exists = await MealModel.exists(mealId);
      if (!exists) {
        throw new MealLogServiceError("Meal not found in database", "MEAL_NOT_FOUND");
      }
    }

    return await MealLogModel.create({
      userId, planId, week, mealId,
      mealType: normalizedMealType,
      source: normalizedSource,
      mealName: mealName.toString().trim(),
      calories: caloriesNum,
      protein: proteinG,
      carbs: carbsG,
      fats: fatsG,
      notes: notes ? notes.toString().trim() : null,
    });
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    if (error.code === "23505") throw new MealLogServiceError("Meal already logged for this meal type today", "DUPLICATE_MEAL_LOG");
    if (error.code === "23503") throw new MealLogServiceError("Invalid meal reference", "INVALID_MEAL_REFERENCE");
    console.error("Unexpected error in logMealService:", error);
    throw new MealLogServiceError("Failed to log meal", "LOG_MEAL_FAILED");
  }
};

export const getMealLogsService = async (userId, filters = {}) => {
  try {
    if (!userId || isNaN(userId)) {
      throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    }

    const { startDate, endDate, mealType } = filters;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new MealLogServiceError("Start date must be before end date", "INVALID_DATE_RANGE");
    }

    if (mealType) {
      const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
      if (!validMealTypes.includes(mealType.toLowerCase())) {
        throw new MealLogServiceError(
          `Invalid meal type. Must be one of: ${validMealTypes.join(", ")}`,
          "INVALID_MEAL_TYPE"
        );
      }
    }

    return await MealLogModel.findByUser(userId, filters);
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in getMealLogsService:", error);
    throw new MealLogServiceError("Failed to fetch meal logs", "FETCH_LOGS_FAILED");
  }
};

export const getMealLogsByDateService = async (userId, date) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!date) throw new MealLogServiceError("Date is required", "DATE_REQUIRED");
    if (isNaN(new Date(date).getTime())) throw new MealLogServiceError("Invalid date format", "INVALID_DATE_FORMAT");

    return await MealLogModel.findByDate(userId, date);
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in getMealLogsByDateService:", error);
    throw new MealLogServiceError("Failed to fetch meal logs by date", "FETCH_LOGS_BY_DATE_FAILED");
  }
};

export const getDailySummaryService = async (userId, date) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!date) throw new MealLogServiceError("Date is required", "DATE_REQUIRED");
    if (isNaN(new Date(date).getTime())) throw new MealLogServiceError("Invalid date format", "INVALID_DATE_FORMAT");

    const summary = await MealLogModel.getDailySummary(userId, date);
    const totalMacros =
      Number(summary.total_protein || 0) +
      Number(summary.total_carbs || 0) +
      Number(summary.total_fats || 0);

    return {
      ...summary,
      total_macros: totalMacros,
      calories_from_protein: Number(summary.total_protein || 0) * 4,
      calories_from_carbs: Number(summary.total_carbs || 0) * 4,
      calories_from_fats: Number(summary.total_fats || 0) * 9,
      protein_percentage: totalMacros > 0 ? ((Number(summary.total_protein || 0) / totalMacros) * 100).toFixed(1) : 0,
      carbs_percentage: totalMacros > 0 ? ((Number(summary.total_carbs || 0) / totalMacros) * 100).toFixed(1) : 0,
      fats_percentage: totalMacros > 0 ? ((Number(summary.total_fats || 0) / totalMacros) * 100).toFixed(1) : 0,
    };
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in getDailySummaryService:", error);
    throw new MealLogServiceError("Failed to fetch daily summary", "FETCH_SUMMARY_FAILED");
  }
};

export const getRangeSummaryService = async (userId, startDate, endDate) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!startDate || !endDate) throw new MealLogServiceError("Start date and end date are required", "DATES_REQUIRED");

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new MealLogServiceError("Invalid date format", "INVALID_DATE_FORMAT");
    if (start > end) throw new MealLogServiceError("Start date must be before end date", "INVALID_DATE_RANGE");

    const summary = await MealLogModel.getRangeSummary(userId, startDate, endDate);
    const totalDays = summary.length;

    const totals = summary.reduce(
      (acc, day) => ({
        meals: acc.meals + Number(day.meal_count || 0),
        calories: acc.calories + Number(day.total_calories || 0),
        protein: acc.protein + Number(day.total_protein || 0),
        carbs: acc.carbs + Number(day.total_carbs || 0),
        fats: acc.fats + Number(day.total_fats || 0),
      }),
      { meals: 0, calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return {
      daily_summaries: summary,
      range_totals: totals,
      range_averages: {
        avg_meals_per_day: totalDays > 0 ? (totals.meals / totalDays).toFixed(1) : 0,
        avg_calories_per_day: totalDays > 0 ? (totals.calories / totalDays).toFixed(0) : 0,
        avg_protein_per_day: totalDays > 0 ? (totals.protein / totalDays).toFixed(1) : 0,
        avg_carbs_per_day: totalDays > 0 ? (totals.carbs / totalDays).toFixed(1) : 0,
        avg_fats_per_day: totalDays > 0 ? (totals.fats / totalDays).toFixed(1) : 0,
      },
      total_days: totalDays,
    };
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in getRangeSummaryService:", error);
    throw new MealLogServiceError("Failed to fetch range summary", "FETCH_RANGE_SUMMARY_FAILED");
  }
};

export const updateMealLogService = async (userId, logId, updateData) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!logId || isNaN(logId)) throw new MealLogServiceError("Valid log ID is required", "INVALID_LOG_ID");

    const exists = await MealLogModel.exists(logId, userId);
    if (!exists) throw new MealLogServiceError("Meal log not found or unauthorized", "LOG_NOT_FOUND");

    ["calories", "protein", "carbs", "fats"].forEach((field) => {
      if (updateData[field] !== undefined && (isNaN(updateData[field]) || updateData[field] < 0)) {
        throw new MealLogServiceError(
          `${field.charAt(0).toUpperCase() + field.slice(1)} must be a non-negative number`,
          `INVALID_${field.toUpperCase()}`
        );
      }
    });

    return await MealLogModel.updateById(logId, userId, updateData);
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in updateMealLogService:", error);
    throw new MealLogServiceError("Failed to update meal log", "UPDATE_LOG_FAILED");
  }
};

export const deleteMealLogService = async (userId, logId) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!logId || isNaN(logId)) throw new MealLogServiceError("Valid log ID is required", "INVALID_LOG_ID");

    const exists = await MealLogModel.exists(logId, userId);
    if (!exists) throw new MealLogServiceError("Meal log not found or unauthorized", "LOG_NOT_FOUND");

    return await MealLogModel.deleteById(logId, userId);
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in deleteMealLogService:", error);
    throw new MealLogServiceError("Failed to delete meal log", "DELETE_LOG_FAILED");
  }
};

export const getMealLogByIdService = async (userId, logId) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!logId || isNaN(logId)) throw new MealLogServiceError("Valid log ID is required", "INVALID_LOG_ID");

    const log = await MealLogModel.findById(logId, userId);
    if (!log) throw new MealLogServiceError("Meal log not found or unauthorized", "LOG_NOT_FOUND");

    return log;
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in getMealLogByIdService:", error);
    throw new MealLogServiceError("Failed to fetch meal log", "FETCH_LOG_FAILED");
  }
};

export const deleteMealLogsByDateService = async (userId, date) => {
  try {
    if (!userId || isNaN(userId)) throw new MealLogServiceError("Valid user ID is required", "INVALID_USER_ID");
    if (!date) throw new MealLogServiceError("Date is required", "DATE_REQUIRED");
    if (isNaN(new Date(date).getTime())) throw new MealLogServiceError("Invalid date format", "INVALID_DATE_FORMAT");

    return await MealLogModel.deleteByDate(userId, date);
  } catch (error) {
    if (error instanceof MealLogServiceError) throw error;
    console.error("Unexpected error in deleteMealLogsByDateService:", error);
    throw new MealLogServiceError("Failed to delete meal logs", "DELETE_LOGS_FAILED");
  }
};

export default {

  suggestMealsForProfile,

  getDailySummary,
  getWeeklySummary,

  logMealService,
  getMealLogsService,
  getMealLogsByDateService,
  getMealLogByIdService,
  getDailySummaryService,
  getRangeSummaryService,
  updateMealLogService,
  deleteMealLogService,
  deleteMealLogsByDateService,
};