// src/controllers/dashboard.controller.js
import pool from "../../config/db.config.js";
import ProfileModel from "../../models/profile.model.js";
import WorkoutService from "../../services/workout.service.js";
import { calculateRecommendedCalories, calculateMacroSplit } from "../../domain/nutrition.rules.js";

class DashboardController {

  static async getWorkout(req, res, next) {
    try {
      const userId = req.user.id;

      let workout = await WorkoutService.getTodayWorkout(userId);

      if (!workout) {
        workout = await WorkoutService.generateTodayWorkout(userId);
      }

      if (!workout) {
        return res.json({
          success: true,
          data: null,
          message: "Complete your profile to get a personalized workout plan.",
        });
      }

      return res.json({ success: true, data: workout });
    } catch (err) {
      next(err);
    }
  }

  static async getNutrition(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await ProfileModel.findByUserId(userId);

      if (!profile) {
        return res.json({ success: true, data: null });
      }

      const calories = calculateRecommendedCalories(profile);
      const macros   = calculateMacroSplit(profile);

      const { rows: mealTotals } = await pool.query(
        `SELECT
           COALESCE(SUM(calories_consumed), 0) AS calories,
           COALESCE(SUM(protein_g), 0)         AS protein,
           COALESCE(SUM(carbs_g), 0)           AS carbs,
           COALESCE(SUM(fats_g), 0)            AS fats
         FROM meal_logs
         WHERE user_id = $1 AND log_date = CURRENT_DATE`,
        [userId]
      );

      const consumed = mealTotals[0];

      const { rows: waterRows } = await pool.query(
        `SELECT COALESCE(water_intake_liters, 0) AS water
         FROM progress_logs
         WHERE user_id = $1 AND log_date = CURRENT_DATE
         LIMIT 1`,
        [userId]
      );

      const waterConsumed = waterRows[0]?.water ?? 0;
      const waterTarget   = 2.5;

      return res.json({
        success: true,
        data: {
          calories: {
            consumed: Number(consumed.calories),
            target:   calories?.tdee ?? calories?.calories ?? 2000,
          },
          protein: {
            consumed: Number(consumed.protein),
            target:   macros?.protein_g ?? 150,
          },
          carbs: {
            consumed: Number(consumed.carbs),
            target:   macros?.carbs_g ?? 200,
          },
          fats: {
            consumed: Number(consumed.fats),
            target:   macros?.fats_g ?? 65,
          },
          water: {
            consumed: Number(waterConsumed),
            target:   waterTarget,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMeals(req, res, next) {
    try {
      const { rows } = await pool.query(
        `SELECT
           meal_type,
           meal_name,
           calories_consumed AS cal,
           protein_g         AS p,
           carbs_g           AS c,
           fats_g            AS f,
           consumed_at
         FROM meal_logs
         WHERE user_id = $1 AND log_date = CURRENT_DATE
         ORDER BY consumed_at`,
        [req.user.id]
      );

      const meals = rows.map(row => ({
        time:  new Date(row.consumed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        name:  row.meal_name,
        emoji: DashboardController._mealEmoji(row.meal_type),
        cal:   row.cal,
        p:     row.p,
        c:     row.c,
        f:     row.f,
      }));

      return res.json({ success: true, data: meals });
    } catch (err) {
      next(err);
    }
  }

  // ── FIXED: now selects blood_pressure_systolic, blood_pressure_diastolic,
  //           blood_pressure, and heart_rate from DB instead of hardcoding them ──
  static async getHealth(req, res, next) {
    try {
      const { rows } = await pool.query(
        `SELECT
           sleep_hours,
           energy_level,
           weight_kg,
           heart_rate,
           blood_pressure_systolic,
           blood_pressure_diastolic,
           blood_pressure
         FROM progress_logs
         WHERE user_id = $1
         ORDER BY log_date DESC
         LIMIT 1`,
        [req.user.id]
      );

      if (!rows.length) {
        return res.json({ success: true, data: null });
      }

      const log = rows[0];

      // Build BP string: prefer numeric columns, fall back to string column
      const bpSys = log.blood_pressure_systolic  != null ? Number(log.blood_pressure_systolic)  : null;
      const bpDia = log.blood_pressure_diastolic != null ? Number(log.blood_pressure_diastolic) : null;
      const bp    = bpSys && bpDia
        ? `${bpSys}/${bpDia}`
        : (log.blood_pressure ?? null);

      const heartRate = log.heart_rate != null ? Number(log.heart_rate) : null;
      const sleep     = log.sleep_hours != null ? Number(log.sleep_hours) : null;
      const recovery  = log.energy_level != null ? Number(log.energy_level) * 10 : null;

      return res.json({
        success: true,
        data: {
          sleep,
          sleepStatus:     DashboardController._sleepStatus(sleep),
          heartRate,
          hrStatus:        DashboardController._heartRateStatus(heartRate),
          bp,
          bpStatus:        DashboardController._bpStatus(bpSys),
          bpSystolic:      bpSys,
          bpDiastolic:     bpDia,
          recovery,
          recoveryStatus:  DashboardController._energyStatus(log.energy_level),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWeekly(req, res, next) {
    try {
      const userId = req.user.id;

      const { rows: workoutRows } = await pool.query(
        `SELECT DISTINCT workout_date
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date >= DATE_TRUNC('week', CURRENT_DATE)
           AND workout_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
         ORDER BY workout_date`,
        [userId]
      );

      const { rows: calRows } = await pool.query(
        `SELECT log_date, COALESCE(SUM(calories_consumed), 0) AS cals
         FROM meal_logs
         WHERE user_id = $1
           AND log_date >= DATE_TRUNC('week', CURRENT_DATE)
           AND log_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
         GROUP BY log_date
         ORDER BY log_date`,
        [userId]
      );

      const days     = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const workouts = Array(7).fill(false);
      const calories = Array(7).fill(0);

      workoutRows.forEach(row => {
        const idx = (new Date(row.workout_date).getDay() + 6) % 7;
        workouts[idx] = true;
      });

      calRows.forEach(row => {
        const idx = (new Date(row.log_date).getDay() + 6) % 7;
        calories[idx] = Number(row.cals);
      });

      const daysWorkedOut = workouts.filter(Boolean).length;

      return res.json({
        success: true,
        data: {
          consistency:      `${daysWorkedOut}/7`,
          consistencySub:   "days this week",
          calorieAdherence: "—",
          weightLost:       "—",
          days,
          workouts,
          calories,
          target: Array(7).fill(2000),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInsights(req, res, next) {
    try {
      const userId = req.user.id;

      const [profile, stats, streak] = await Promise.all([
        ProfileModel.findByUserId(userId),
        WorkoutService.getWorkoutStats(userId, { days: 7 }),
        WorkoutService._getCurrentStreak(userId),
      ]);

      const insights = [];

      if (streak >= 3) {
        insights.push({
          icon:  "🔥",
          text:  `You're on a ${streak}-day streak! Keep it going.`,
          color: "#FF5C1A",
        });
      }

      if (stats?.workouts_completed >= 5) {
        insights.push({
          icon:  "💪",
          text:  `Great week! ${stats.workouts_completed} workouts completed.`,
          color: "#B8F000",
        });
      } else if (stats?.workouts_completed === 0) {
        insights.push({
          icon:  "🎯",
          text:  "No workouts logged this week yet. Start today!",
          color: "#00C8E0",
        });
      }

      if (profile?.goal === "weight_loss") {
        insights.push({
          icon:  "🥗",
          text:  "Log your meals to track your calorie deficit.",
          color: "#00C8E0",
        });
      }

      if (profile?.goal === "muscle_gain") {
        insights.push({
          icon:  "🍗",
          text:  "Make sure you're hitting your protein target every day.",
          color: "#B8F000",
        });
      }

      if (!insights.length) {
        insights.push({
          icon:  "👋",
          text:  "Complete your first workout to unlock personalized insights.",
          color: "#FF5C1A",
        });
      }

      return res.json({ success: true, data: insights });
    } catch (err) {
      next(err);
    }
  }

  static async getStreak(req, res, next) {
    try {
      const streak = await WorkoutService._getCurrentStreak(req.user.id);
      return res.json({ success: true, data: { streak } });
    } catch (err) {
      next(err);
    }
  }

  // ── helpers ──

  static _mealEmoji(type) {
    const map = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snacks: "🍎" };
    return map[type?.toLowerCase()] ?? "🍽️";
  }

  static _sleepStatus(hours) {
    if (!hours) return null;
    if (hours >= 8) return "Excellent";
    if (hours >= 7) return "Good";
    if (hours >= 6) return "Fair";
    return "Low";
  }

  static _heartRateStatus(bpm) {
    if (!bpm) return null;
    if (bpm < 60)   return "Low";
    if (bpm <= 100) return "Normal";
    return "Elevated";
  }

  static _bpStatus(systolic) {
    if (!systolic) return null;
    if (systolic < 120) return "Normal";
    if (systolic < 130) return "Elevated";
    if (systolic < 140) return "Stage 1";
    return "Stage 2";
  }

  static _energyStatus(level) {
    if (!level) return null;
    if (level >= 8) return "High";
    if (level >= 5) return "Moderate";
    return "Low";
  }
}

export default DashboardController;