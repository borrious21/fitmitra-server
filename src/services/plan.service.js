// src/services/plan.service.js

import PlanModel from "../models/plan.model.js";
import ProfileModel from "../models/profile.model.js";
import { generatePlan as runPlanGenerator } from "./plan.generator.js";

export function computeCalorieAdjustment({ weightTrend, targetKcal, goal }) {
  if (!weightTrend || weightTrend.length < 2) {
    return { adjustment: 0, reason: "Not enough data yet." };
  }

  const latest = weightTrend[weightTrend.length - 1].weight_kg;
  const prev   = weightTrend[weightTrend.length - 2].weight_kg;
  const delta  = latest - prev;

  if (goal === "weight_loss") {
    if (delta > -0.2) return { adjustment: -150, reason: "Weight not dropping. Reducing daily calories by ~150 kcal." };
    if (delta < -1.0) return { adjustment: +100, reason: "Weight dropping too fast. Adding ~100 kcal to protect muscle." };
    return { adjustment: 0, reason: "On track for weight loss." };
  }

  if (goal === "muscle_gain") {
    if (delta < 0.1) return { adjustment: +150, reason: "Not gaining. Adding ~150 kcal to support muscle growth." };
    if (delta > 0.5) return { adjustment: -100, reason: "Gaining too fast (risk of excess fat). Trimming ~100 kcal." };
    return { adjustment: 0, reason: "On track for muscle gain." };
  }

  return { adjustment: 0, reason: "Maintenance — no calorie change needed." };
}

// ── INSIGHTS ─────────────────────────────────────────────────

export function generateInsights({ thisWeekLogs = [], lastWeekLogs = [], totalWorkoutsThisWeek = 0 }) {
  const insights = [];
  const completedThisWeek = thisWeekLogs.filter((l) => l.completed).length;
  insights.push(`You completed ${completedThisWeek}/${totalWorkoutsThisWeek} workouts this week.`);

  if (lastWeekLogs.length > 0) {
    const completedLastWeek = lastWeekLogs.filter((l) => l.completed).length;
    if (completedLastWeek > 0) {
      const improvePct = Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100);
      if (improvePct > 0)       insights.push(`Your consistency improved ${improvePct}% from last week. Keep it up!`);
      else if (improvePct < 0)  insights.push(`Consistency dipped ${Math.abs(improvePct)}% vs. last week — try scheduling sessions in advance.`);
      else                      insights.push("Same consistency as last week — solid baseline.");
    }
  }

  const totalKcal = thisWeekLogs.reduce((sum, l) => sum + (l.kcal_burned ?? 0), 0);
  if (totalKcal > 0) insights.push(`Estimated ${totalKcal} kcal burned in workouts this week.`);

  const pbs = thisWeekLogs.filter((l) => l.personal_best);
  if (pbs.length > 0) insights.push(`New personal best${pbs.length > 1 ? "s" : ""} set: ${pbs.map((l) => l.exercise_name).join(", ")}! 🎉`);

  const totalVolume = thisWeekLogs.reduce((sum, l) => sum + (l.total_volume_kg ?? 0), 0);
  if (totalVolume > 0) insights.push(`Total training volume this week: ${totalVolume.toLocaleString()} kg lifted.`);

  return insights;
}

// ── PROGRESSION RECOMMENDATION ───────────────────────────────

export function recommendProgression({ log, currentExercise }) {
  const { sets_completed, reps_completed, perceived_effort } = log;
  const allSetsCompleted =
    sets_completed >= currentExercise.sets && reps_completed >= currentExercise.reps;

  if (!allSetsCompleted) {
    return { action: "maintain", message: "Complete all sets/reps before progressing." };
  }
  if (perceived_effort === "easy") {
    return { action: "increase_weight", weight_increase_kg: 2.5, message: "+2.5 kg next session — it felt easy." };
  }
  if (perceived_effort === "medium") {
    return { action: "increase_reps", reps_increase: 1, message: "+1 rep per set next session." };
  }
  return { action: "add_set", message: "Add 1 extra set next session to build volume." };
}

export function computeProgressMetrics({ weightLogs = [], strengthLogs = [], measurements = [] }) {
  const metrics = {};

  if (weightLogs.length >= 2) {
    const first = weightLogs[0].weight_kg;
    const last  = weightLogs[weightLogs.length - 1].weight_kg;
    metrics.weight_change_kg = parseFloat((last - first).toFixed(1));
    metrics.weight_trend     = last < first ? "losing" : last > first ? "gaining" : "stable";
    metrics.current_weight_kg = last;
  }

  if (strengthLogs.length > 0) {
    const bests = {};
    for (const log of strengthLogs) {
      if (!bests[log.exercise_name] || log.weight_kg > bests[log.exercise_name]) {
        bests[log.exercise_name] = log.weight_kg;
      }
    }
    metrics.strength_prs = bests;
  }

  if (measurements.length >= 2) {
    const first = measurements[0];
    const last  = measurements[measurements.length - 1];
    metrics.measurement_changes = {};
    for (const key of Object.keys(last)) {
      if (typeof last[key] === "number" && typeof first[key] === "number") {
        metrics.measurement_changes[key] = parseFloat((last[key] - first[key]).toFixed(1));
      }
    }
  }

  return metrics;
}

const PlanService = {
  async generateAndSave(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    if (!profile) {
      const err = new Error("Profile not found. Please complete your profile first.");
      err.statusCode = 404;
      throw err;
    }

    const input = {
      fitnessLevel:      profile.activity_level,
      dietType:          profile.diet_type ?? "veg",
      duration:          profile.plan_duration ?? 4,
      goals:             profile.goal,
      habits:            profile.custom_habits ?? [],
      medicalConditions: profile.medical_conditions ?? [],
      bodyWeightKg:      profile.weight_kg ?? 70,
      targetKcal:        profile.target_kcal ?? null,
    };

    const generated = runPlanGenerator(input);

    if (!generated?.schedule || !Array.isArray(generated.schedule)) {
      const err = new Error("Plan generation failed. Invalid generator output.");
      err.statusCode = 500;
      throw err;
    }

    const workoutPlan = generated.schedule.map((week) => ({
      week:      week.week,
      focus:     week.focus,
      is_deload: week.is_deload,
      workouts:  week.workouts,
    }));

    const mealPlan = generated.schedule.map((week) => ({
      week:      week.week,
      meals:     week.meals,
      nutrition_targets: week.nutrition_targets,
    }));

    await PlanModel.deactivateAllPlans(userId);

    const saved = await PlanModel.create({
      user_id: userId,
      profile_snapshot: input,
      plan_data: {
        workout:  workoutPlan,
        meals:    mealPlan,
        habits:   input.habits,
        summary:  generated.summary,
      },
    });

    return saved;
  },

  async getActivePlan(userId) {
    const plan = await PlanModel.getActivePlanByUser(userId);
    if (!plan) {
      const err = new Error("No active plan found.");
      err.statusCode = 404;
      throw err;
    }
    return plan;
  },

  async getPlanHistory(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const [plans, stats] = await Promise.all([
      PlanModel.getPlansByUser(userId, { limit: Number(limit), offset: Number(offset) }),
      PlanModel.getUserPlanStats(userId),
    ]);
    return {
      plans,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total:      Number(stats.total_plans),
        totalPages: Math.ceil(stats.total_plans / limit),
      },
      stats,
    };
  },

  async getPlanById(planId, userId) {
    const plan = await PlanModel.getPlanById(planId);
    if (!plan) {
      const err = new Error("Plan not found.");
      err.statusCode = 404;
      throw err;
    }
    if (plan.user_id !== userId) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }
    return plan;
  },

  async activatePlan(planId, userId) {
    const activated = await PlanModel.activatePlan(planId, userId);
    if (!activated) {
      const err = new Error("Plan not found or does not belong to you.");
      err.statusCode = 404;
      throw err;
    }
    return activated;
  },

  async completePlan(planId, userId) {
    const completed = await PlanModel.completePlan(planId, userId);
    if (!completed) {
      const err = new Error("Plan not found or does not belong to you.");
      err.statusCode = 404;
      throw err;
    }
    return completed;
  },

  async deletePlan(planId, userId) {
    await PlanModel.deletePlan(planId, userId);
  },

  async getStats(userId) {
    return PlanModel.getUserPlanStats(userId);
  },
};

export default PlanService;