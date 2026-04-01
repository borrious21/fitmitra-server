// src/services/smartRecommendation.service.js
// Analyzes user's last 7 days of data and generates adaptive recommendations.
// Uses data from: progress_logs, workout_logs, meal_logs, nutrition_plans, profiles

import pool from "../config/db.config.js";

// ─── Fetch all needed data ────────────────────────────────────────────────────
async function fetchUserData(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().split("T")[0];

  const [profile, weightLogs, workoutLogs, mealLogs, nutritionPlan] = await Promise.all([
    // Profile + goal
    pool.query(
      `SELECT p.goal, p.weight_kg, p.activity_level, p.age, p.gender, p.height_cm,
              p.medical_conditions, p.diet_type
       FROM profiles p WHERE p.user_id = $1`,
      [userId]
    ),

    // Last 14 days of weight logs for trend
    pool.query(
      `SELECT weight_kg, logged_date
       FROM weight_logs
       WHERE user_id = $1 AND logged_date >= NOW() - INTERVAL '14 days'
       ORDER BY logged_date ASC`,
      [userId]
    ),

    // Workout logs last 7 days
    pool.query(
      `SELECT workout_date, exercise_name, sets_completed, reps_completed,
              weight_used, perceived_exertion, fatigue_level, all_sets_completed
       FROM workout_logs
       WHERE user_id = $1 AND workout_date >= $2
       ORDER BY workout_date DESC`,
      [userId, since]
    ),

    // Meal logs last 7 days — daily totals
    pool.query(
      `SELECT log_date,
              SUM(calories_consumed)  AS calories,
              SUM(protein_g)          AS protein_g,
              SUM(carbs_g)            AS carbs_g,
              SUM(fats_g)             AS fats_g
       FROM meal_logs
       WHERE user_id = $1 AND log_date >= $2
       GROUP BY log_date
       ORDER BY log_date DESC`,
      [userId, since]
    ),

    // Active nutrition plan
    pool.query(
      `SELECT calorie_target, protein_g, carbs_g, fats_g, water_target_liters
       FROM nutrition_plans
       WHERE user_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [userId]
    ),
  ]);

  return {
    profile:       profile.rows[0]       || null,
    weightLogs:    weightLogs.rows        || [],
    workoutLogs:   workoutLogs.rows       || [],
    mealLogs:      mealLogs.rows          || [],
    nutritionPlan: nutritionPlan.rows[0]  || null,
  };
}

// ─── Analyse weight trend ─────────────────────────────────────────────────────
function analyseWeight(weightLogs, goal) {
  if (weightLogs.length < 2) {
    return { trend: "insufficient_data", change_kg: null, weekly_rate: null, status: "unknown" };
  }

  const first   = Number(weightLogs[0].weight_kg);
  const last    = Number(weightLogs[weightLogs.length - 1].weight_kg);
  const change  = last - first;                          // positive = gained
  const days    = weightLogs.length;
  const weeklyRate = (change / days) * 7;                // kg per week

  let status = "on_track";

  if (goal === "weight_loss") {
    if (weeklyRate > -0.1)       status = "too_slow";   // losing < 0.1kg/week
    else if (weeklyRate < -1.0)  status = "too_fast";   // losing > 1kg/week
    else                         status = "on_track";
  } else if (goal === "muscle_gain") {
    if (weeklyRate < 0.1)        status = "too_slow";
    else if (weeklyRate > 0.5)   status = "too_fast";
    else                         status = "on_track";
  } else {
    // maintenance
    if (Math.abs(weeklyRate) > 0.3) status = "drifting";
    else                            status = "on_track";
  }

  return { trend: change < 0 ? "losing" : "gaining", change_kg: Math.round(change * 10) / 10, weekly_rate: Math.round(weeklyRate * 10) / 10, status };
}

// ─── Analyse workout consistency ──────────────────────────────────────────────
function analyseWorkouts(workoutLogs) {
  const uniqueDays   = new Set(workoutLogs.map(w => w.workout_date?.toString().split("T")[0])).size;
  const completedAll = workoutLogs.filter(w => w.all_sets_completed).length;
  const total        = workoutLogs.length;
  const avgExertion  = total > 0
    ? workoutLogs.reduce((s, w) => s + (Number(w.perceived_exertion) || 5), 0) / total
    : 5;
  const avgFatigue   = total > 0
    ? workoutLogs.reduce((s, w) => s + (Number(w.fatigue_level) || 5), 0) / total
    : 5;

  let consistency = "low";
  if (uniqueDays >= 5)      consistency = "high";
  else if (uniqueDays >= 3) consistency = "medium";

  return {
    days_active:       uniqueDays,
    total_sets_logged: total,
    completion_rate:   total > 0 ? Math.round((completedAll / total) * 100) : 0,
    avg_exertion:      Math.round(avgExertion * 10) / 10,
    avg_fatigue:       Math.round(avgFatigue * 10) / 10,
    consistency,
  };
}

// ─── Analyse nutrition ────────────────────────────────────────────────────────
function analyseNutrition(mealLogs, nutritionPlan) {
  if (!mealLogs.length) {
    return { avg_calories: 0, calorie_target: nutritionPlan?.calorie_target ?? 0, adherence_pct: 0, protein_avg: 0, logged_days: 0, status: "not_logging" };
  }

  const target    = Number(nutritionPlan?.calorie_target ?? 0);
  const avgCal    = mealLogs.reduce((s, d) => s + Number(d.calories), 0) / mealLogs.length;
  const avgProt   = mealLogs.reduce((s, d) => s + Number(d.protein_g), 0) / mealLogs.length;
  const adherence = target > 0 ? Math.round((avgCal / target) * 100) : 0;

  let status = "on_target";
  if (adherence < 80)       status = "under_eating";
  else if (adherence > 115) status = "over_eating";

  return {
    avg_calories:    Math.round(avgCal),
    calorie_target:  target,
    adherence_pct:   adherence,
    protein_avg:     Math.round(avgProt * 10) / 10,
    logged_days:     mealLogs.length,
    status,
  };
}

// ─── Core recommendation engine ───────────────────────────────────────────────
function generateRecommendations({ profile, weightAnalysis, workoutAnalysis, nutritionAnalysis }) {
  const recommendations = [];
  const adjustments     = { calorie_delta: 0, intensity_signal: "maintain" };
  const goal            = profile?.goal ?? "maintenance";

  // ── 1. Calorie adjustments ─────────────────────────────────────────────────
  if (goal === "weight_loss") {
    if (weightAnalysis.status === "too_slow" && nutritionAnalysis.status !== "under_eating") {
      adjustments.calorie_delta = -200;
      recommendations.push({
        type:     "nutrition",
        priority: "high",
        icon:     "🍽️",
        title:    "Reduce calorie intake",
        message:  `Weight loss is slower than expected (${weightAnalysis.weekly_rate}kg/week vs target -0.5kg). Cut 200 kcal from daily intake.`,
        action:   `New target: ${(nutritionAnalysis.calorie_target - 200).toLocaleString()} kcal/day`,
        color:    "#f59e0b",
      });
    } else if (weightAnalysis.status === "too_fast") {
      adjustments.calorie_delta = +150;
      recommendations.push({
        type:     "nutrition",
        priority: "medium",
        icon:     "⚠️",
        title:    "Losing weight too fast",
        message:  `You're losing ${Math.abs(weightAnalysis.weekly_rate)}kg/week — too aggressive. Add 150 kcal to protect muscle.`,
        action:   `New target: ${(nutritionAnalysis.calorie_target + 150).toLocaleString()} kcal/day`,
        color:    "#ef4444",
      });
    }
  }

  if (goal === "muscle_gain") {
    if (weightAnalysis.status === "too_slow") {
      adjustments.calorie_delta = +200;
      recommendations.push({
        type:     "nutrition",
        priority: "high",
        icon:     "💪",
        title:    "Increase calorie surplus",
        message:  `Muscle gain is too slow (${weightAnalysis.weekly_rate}kg/week). Add 200 kcal to support growth.`,
        action:   `New target: ${(nutritionAnalysis.calorie_target + 200).toLocaleString()} kcal/day`,
        color:    "#10b981",
      });
    }
  }

  // ── 2. Workout intensity ───────────────────────────────────────────────────
  if (workoutAnalysis.consistency === "low") {
    adjustments.intensity_signal = "reduce";
    recommendations.push({
      type:     "workout",
      priority: "high",
      icon:     "📉",
      title:    "Low workout consistency",
      message:  `Only ${workoutAnalysis.days_active}/7 days active this week. Simplify: aim for 3 focused sessions instead of 5.`,
      action:   "Reduce to 3 workouts/week — consistency beats volume",
      color:    "#ef4444",
    });
  } else if (workoutAnalysis.consistency === "high" && workoutAnalysis.completion_rate >= 80) {
    if (workoutAnalysis.avg_exertion < 7) {
      adjustments.intensity_signal = "increase";
      recommendations.push({
        type:     "workout",
        priority: "medium",
        icon:     "🚀",
        title:    "Ready to level up",
        message:  `${workoutAnalysis.days_active}/7 days active, ${workoutAnalysis.completion_rate}% completion. Your exertion (${workoutAnalysis.avg_exertion}/10) suggests room to push harder.`,
        action:   "Increase weight by 2.5kg or add 1 set per exercise",
        color:    "#10b981",
      });
    }
  }

  // ── 3. Recovery warning ────────────────────────────────────────────────────
  if (workoutAnalysis.avg_fatigue >= 8) {
    adjustments.intensity_signal = "reduce";
    recommendations.push({
      type:     "recovery",
      priority: "high",
      icon:     "😴",
      title:    "High fatigue detected",
      message:  `Average fatigue is ${workoutAnalysis.avg_fatigue}/10 this week. Your body needs a deload.`,
      action:   "Take 1–2 rest days, reduce weights by 30% for next session",
      color:    "#8b5cf6",
    });
  }

  // ── 4. Nutrition logging nudge ─────────────────────────────────────────────
  if (nutritionAnalysis.status === "not_logging" || nutritionAnalysis.logged_days < 3) {
    recommendations.push({
      type:     "nutrition",
      priority: "medium",
      icon:     "📊",
      title:    "Log meals consistently",
      message:  `Only ${nutritionAnalysis.logged_days}/7 days logged. Without data, recommendations are less accurate.`,
      action:   "Log all 3 main meals daily for better insights",
      color:    "#f59e0b",
    });
  }

  // ── 5. Protein check ───────────────────────────────────────────────────────
  const proteinTarget = Number(profile?.weight_kg ?? 70) * 1.8; // 1.8g/kg bodyweight
  if (nutritionAnalysis.protein_avg > 0 && nutritionAnalysis.protein_avg < proteinTarget * 0.8) {
    recommendations.push({
      type:     "nutrition",
      priority: "medium",
      icon:     "🥩",
      title:    "Protein intake too low",
      message:  `Averaging ${nutritionAnalysis.protein_avg}g protein/day. Target for your weight: ${Math.round(proteinTarget)}g.`,
      action:   `Add 1 extra protein source per meal (eggs, dal, chicken, chhurpi)`,
      color:    "#FF5C1A",
    });
  }

  // ── 6. All good ────────────────────────────────────────────────────────────
  if (recommendations.length === 0) {
    recommendations.push({
      type:     "positive",
      priority: "low",
      icon:     "✅",
      title:    "You're on track!",
      message:  "Consistency, nutrition, and recovery all look good this week. Keep it up.",
      action:   "Maintain current routine — progress takes time",
      color:    "#10b981",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { recommendations, adjustments };
}

// ─── Save calorie adjustment to nutrition_adjustments table ──────────────────
async function saveCalorieAdjustment(userId, currentTarget, delta) {
  if (!delta || delta === 0 || !currentTarget) return;
  const newTarget = Math.max(1200, currentTarget + delta); // never go below 1200

  await pool.query(
    `INSERT INTO nutrition_adjustments (user_id, previous_target, new_target, reason, adjusted_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId, currentTarget, newTarget,
     delta < 0 ? "auto_adjust_too_slow_weight_loss" : "auto_adjust_muscle_gain_support"]
  );

  // Update nutrition plan
  await pool.query(
    `UPDATE nutrition_plans SET calorie_target = $1, updated_at = NOW()
     WHERE user_id = $2 AND is_active = TRUE`,
    [newTarget, userId]
  );

  return newTarget;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function getSmartRecommendations(userId, applyAdjustments = false) {
  const data = await fetchUserData(userId);

  if (!data.profile) {
    throw new Error("Profile not found. Complete your profile first.");
  }

  const weightAnalysis   = analyseWeight(data.weightLogs, data.profile.goal);
  const workoutAnalysis  = analyseWorkouts(data.workoutLogs);
  const nutritionAnalysis = analyseNutrition(data.mealLogs, data.nutritionPlan);

  const { recommendations, adjustments } = generateRecommendations({
    profile: data.profile,
    weightAnalysis,
    workoutAnalysis,
    nutritionAnalysis,
  });

  // Optionally auto-apply the calorie adjustment
  let appliedCalorieTarget = null;
  if (applyAdjustments && adjustments.calorie_delta !== 0 && data.nutritionPlan) {
    appliedCalorieTarget = await saveCalorieAdjustment(
      userId, data.nutritionPlan.calorie_target, adjustments.calorie_delta
    );
  }

  return {
    generated_at:    new Date().toISOString(),
    period:          "last_7_days",
    goal:            data.profile.goal,
    analysis: {
      weight:    weightAnalysis,
      workout:   workoutAnalysis,
      nutrition: nutritionAnalysis,
    },
    adjustments: {
      ...adjustments,
      applied_calorie_target: appliedCalorieTarget,
    },
    recommendations,
    data_quality: {
      has_weight_data:   data.weightLogs.length >= 2,
      has_workout_data:  data.workoutLogs.length > 0,
      has_meal_data:     data.mealLogs.length >= 3,
      completeness_pct:  Math.round(
        ((data.weightLogs.length >= 2 ? 1 : 0) +
         (data.workoutLogs.length > 0 ? 1 : 0) +
         (data.mealLogs.length >= 3   ? 1 : 0)) / 3 * 100
      ),
    },
  };
}