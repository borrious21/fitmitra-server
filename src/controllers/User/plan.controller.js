import PlanService, {
  generateInsights,
  computeCalorieAdjustment,
  recommendProgression,
  computeProgressMetrics,
} from "../../services/plan.service.js";

import {
  computeXP,
  getMissedWorkoutRecovery,
  adaptiveDifficultySignal,
} from "../../services/gamification.service.js";

import pool from "../../config/db.config.js";
import response from "../../utils/response.util.js";

class PlanController {

  static async generatePlan(req, res, next) {
    try {
      const saved = await PlanService.generateAndSave(req.user.id);
      return response(res, 201, true, "Plan generated successfully", saved);
    } catch (error) { next(error); }
  }

  static async getActivePlan(req, res, next) {
    try {
      const plan = await PlanService.getActivePlan(req.user.id);
      return response(res, 200, true, "Active plan retrieved", plan);
    } catch (error) { next(error); }
  }

  static async getPlanHistory(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const data = await PlanService.getPlanHistory(req.user.id, { page, limit });
      return response(res, 200, true, "Plan history retrieved", data);
    } catch (error) { next(error); }
  }

  static async getPlanById(req, res, next) {
    try {
      const plan = await PlanService.getPlanById(req.params.id, req.user.id);
      return response(res, 200, true, "Plan retrieved", plan);
    } catch (error) { next(error); }
  }

  static async getPlanStats(req, res, next) {
    try {
      const stats = await PlanService.getStats(req.user.id);
      return response(res, 200, true, "Plan stats retrieved", stats);
    } catch (error) { next(error); }
  }

  static async activatePlan(req, res, next) {
    try {
      const activated = await PlanService.activatePlan(req.params.id, req.user.id);
      return response(res, 200, true, "Plan activated", activated);
    } catch (error) { next(error); }
  }

  static async completePlan(req, res, next) {
    try {
      const completed = await PlanService.completePlan(req.params.id, req.user.id);
      return response(res, 200, true, "Plan completed", completed);
    } catch (error) { next(error); }
  }

  static async deletePlan(req, res, next) {
    try {
      await PlanService.deletePlan(req.params.id, req.user.id);
      return response(res, 200, true, "Plan deleted");
    } catch (error) { next(error); }
  }

  static async getGamification(req, res, next) {
    try {
      const userId = req.user.id;

      // ✅ FIXED: use actual column names from workout_logs schema
      // Schema has: all_sets_completed, perceived_exertion, workout_date
      // No columns: completed, personal_best, is_deload, perceived_effort, week_number
      let logRows = [];
      try {
        const { rows } = await pool.query(
          `SELECT
             wl.workout_date                          AS date,
             wl.all_sets_completed                    AS completed,
             FALSE                                    AS personal_best,
             FALSE                                    AS is_deload,
             CASE
               WHEN wl.perceived_exertion <= 4 THEN 'easy'
               WHEN wl.perceived_exertion >= 8 THEN 'hard'
               ELSE 'moderate'
             END                                      AS perceived_effort,
             NULL                                     AS week,
             (pl.sleep_hours IS NOT NULL)             AS sleep_logged,
             (pl.water_intake_liters IS NOT NULL)     AS hydration_logged
           FROM workout_logs wl
           LEFT JOIN progress_logs pl
             ON pl.user_id = wl.user_id
             AND pl.log_date = wl.workout_date
           WHERE wl.user_id = $1
             AND wl.workout_date >= CURRENT_DATE - INTERVAL '90 days'
           ORDER BY wl.workout_date ASC`,
          [userId]
        );
        logRows = rows;
        console.log(`[gamification] ${logRows.length} workout logs found for user ${userId}`);
      } catch (err) {
        console.error("[gamification] SQL error:", err.message);
        logRows = [];
      }

      // Check exercise PRs to mark personal_best
      try {
        const { rows: prRows } = await pool.query(
          `SELECT DISTINCT achieved_at::date AS pr_date
           FROM exercise_prs
           WHERE user_id = $1
             AND achieved_at >= CURRENT_DATE - INTERVAL '90 days'`,
          [userId]
        );
        const prDates = new Set(prRows.map(r => new Date(r.pr_date).toDateString()));

        // Mark any log on a PR date as personal_best = true
        logRows = logRows.map(log => ({
          ...log,
          personal_best: prDates.has(new Date(log.date).toDateString()),
        }));
      } catch { /* PR check is optional */ }

      // Get weekly plans for "all workouts completed" bonus
      let weeklyPlans = [];
      try {
        const { rows: planRows } = await pool.query(
          `SELECT workout_plan FROM plans WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
          [userId]
        );
        if (planRows[0]?.workout_plan) {
          const wp = planRows[0].workout_plan;
          if (Array.isArray(wp)) {
            weeklyPlans = wp.map(w => ({
              week:     w.week,
              workouts: (w.workouts ?? []).filter(Boolean),
            }));
          }
        }
      } catch { }

      const gamification = computeXP(logRows, weeklyPlans);
      console.log(`[gamification] XP=${gamification.xp} Level=${gamification.level.current} Badges=${gamification.badges.length}`);
      return response(res, 200, true, "Gamification data retrieved", gamification);
    } catch (error) {
      next(error);
    }
  }

  static async missedWorkout(req, res, next) {
    try {
      const { split } = req.body ?? {};
      if (!split) {
        return response(res, 400, false, "split is required (e.g. 'Push', 'Legs')");
      }
      const recovery = getMissedWorkoutRecovery(split);
      return response(res, 200, true, "Missed workout recovery suggestion", recovery);
    } catch (error) { next(error); }
  }

  static async adaptiveDifficulty(req, res, next) {
    try {
      const { recent_logs = [] } = req.body ?? {};
      const signal = adaptiveDifficultySignal(recent_logs);
      return response(res, 200, true, "Adaptive difficulty signal", signal);
    } catch (error) { next(error); }
  }

  static async getInsights(req, res, next) {
    try {
      const {
        this_week_logs           = [],
        last_week_logs           = [],
        total_workouts_this_week = 0,
      } = req.body ?? {};

      const insights = generateInsights({
        thisWeekLogs:          this_week_logs,
        lastWeekLogs:          last_week_logs,
        totalWorkoutsThisWeek: total_workouts_this_week,
      });
      return response(res, 200, true, "Insights generated", { insights });
    } catch (error) { next(error); }
  }

  static async getCalorieAdjustment(req, res, next) {
    try {
      const { weight_trend, target_kcal, goal } = req.body ?? {};
      const result = computeCalorieAdjustment({
        weightTrend: weight_trend,
        targetKcal:  target_kcal,
        goal,
      });
      return response(res, 200, true, "Calorie adjustment computed", result);
    } catch (error) { next(error); }
  }

  static async getProgression(req, res, next) {
    try {
      const { log, current_exercise } = req.body ?? {};
      if (!log || !current_exercise) {
        return response(res, 400, false, "log and current_exercise are required");
      }
      const result = recommendProgression({ log, currentExercise: current_exercise });
      return response(res, 200, true, "Progression recommendation", result);
    } catch (error) { next(error); }
  }

  static async getProgressMetrics(req, res, next) {
    try {
      const {
        weight_logs   = [],
        strength_logs = [],
        measurements  = [],
      } = req.body ?? {};

      const metrics = computeProgressMetrics({
        weightLogs:   weight_logs,
        strengthLogs: strength_logs,
        measurements,
      });
      return response(res, 200, true, "Progress metrics computed", metrics);
    } catch (error) { next(error); }
  }
}

export default PlanController;