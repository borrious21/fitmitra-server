// src/services/workout.service.js

import pool              from '../config/db.config.js';
import { getTodayKey }   from '../utils/day.utils.js';
import { generateWorkoutPlan, computeProgression, estimateCaloriesBurned } from '../domain/workout.generator.js';
import ProfileModel      from '../models/profile.model.js';
import WorkoutModel      from '../models/workout.model.js';

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Utility: safely convert any Postgres numeric/string to a JS number with fixed decimals
const toNum = (val, decimals = 1) => parseFloat(parseFloat(val || 0).toFixed(decimals));

const FOCUS_KCAL_ESTIMATES = {
  'Chest':              220, 'Back':               260, 'Shoulders':          200,
  'Biceps':             150, 'Triceps':            150, 'Legs':               350,
  'Lower Body':         340, 'Core':               160, 'Full Body':          380,
  'Full Body Strength': 360, 'Full Body (Light)':  260, 'Upper Body':         240,
  'Cardio (Moderate)':  300, 'Cardio (30 min)':    280, 'Moderate Cardio':    270,
  'Low-Intensity Cardio (30 min)': 180,
  'Legs (Strength + Short Cardio)': 400,
};

// Day-slot patterns shared between getWorkoutForDate (Shape A) and Plans.jsx
// Sun=0, Mon=1 … Sat=6. Saturday(6) is ALWAYS the rest day.
// Sunday(0) becomes a workout day as count increases.
const DAY_PATTERNS = {
  1: [1],                    // Mon
  2: [1, 4],                 // Mon, Thu
  3: [1, 3, 5],              // Mon, Wed, Fri
  4: [1, 2, 4, 5],           // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5],        // Mon–Fri
  6: [0, 1, 2, 3, 4, 5],     // Sun–Fri  (Sat always rest)
};

class WorkoutService {

  static async getTodayWorkout(userId) {
    return this.getWorkoutForDate(userId, new Date());
  }

  static async generateTodayWorkout(userId) {
    try {
      const numericUserId = Number(userId);
      const profile = await ProfileModel.findByUserId(numericUserId);
      if (!profile) return null;

      const { rows: existing } = await pool.query(
        `SELECT id FROM plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (existing.length > 0) return this.getWorkoutForDate(numericUserId, new Date());

      await this._generateAndStoreMesocycle(numericUserId, profile, 1, {});
      return this.getWorkoutForDate(numericUserId, new Date());
    } catch (err) {
      console.error('WorkoutService:generateTodayWorkout', err);
      return null;
    }
  }

  static async _generateAndStoreMesocycle(userId, profile, weekInMesocycle = 1, progressionMap = {}) {
    const { rows: recentRows } = await pool.query(
      `SELECT DISTINCT exercise_name FROM workout_logs
       WHERE user_id = $1 AND workout_date >= CURRENT_DATE - INTERVAL '14 days'`,
      [userId]
    );
    const recentExerciseNames = recentRows.map(r => r.exercise_name);

    const workoutPlan = generateWorkoutPlan(
      { ...profile, recent_exercise_names: recentExerciseNames },
      weekInMesocycle,
      progressionMap,
    );
    const mealPlan = { diet_type: profile.diet_type, goal: profile.goal };

    await pool.query(
      `UPDATE plans SET is_active = false WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    await pool.query(
      `INSERT INTO plans (user_id, workout_plan, meal_plan, is_active, duration_weeks, goals,
                          mesocycle_week, started_at)
       VALUES ($1, $2, $3, true, 4, $4, $5, CURRENT_DATE)`,
      [userId, JSON.stringify(workoutPlan), JSON.stringify(mealPlan), profile.goal, weekInMesocycle]
    );

    return workoutPlan;
  }

  static async advanceMesocycleWeek(userId) {
    try {
      const numericUserId = Number(userId);
      const { rows } = await pool.query(
        `SELECT workout_plan, mesocycle_week, started_at
         FROM plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (!rows.length) return null;

      const currentWeek  = rows[0].mesocycle_week || 1;
      const nextWeek     = currentWeek >= 4 ? 1 : currentWeek + 1;
      const isNewBlock   = nextWeek === 1;

      const profile        = await ProfileModel.findByUserId(numericUserId);
      const progressionMap = isNewBlock
        ? await this._buildProgressionMapFromHistory(numericUserId)
        : (rows[0].workout_plan?.progression_targets || {});

      return this._generateAndStoreMesocycle(numericUserId, profile, nextWeek, progressionMap);
    } catch (err) {
      console.error('WorkoutService:advanceMesocycleWeek', err);
      return null;
    }
  }

  static async _buildProgressionMapFromHistory(userId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (exercise_name)
         exercise_name,
         sets_completed  AS sets,
         reps_completed  AS reps,
         weight_used     AS weight_kg,
         all_sets_completed,
         perceived_exertion AS rpe
       FROM workout_logs
       WHERE user_id = $1
         AND workout_date >= CURRENT_DATE - INTERVAL '28 days'
         AND sets_completed IS NOT NULL
       ORDER BY exercise_name, workout_date DESC`,
      [userId]
    );

    const profile = await ProfileModel.findByUserId(userId);
    const goal    = profile?.goal || 'maintain_fitness';
    const difficultyLevel = 2;

    const map = {};
    for (const row of rows) {
      const next = computeProgression(
        {
          sets:               row.sets,
          reps:               row.reps,
          weight:             row.weight_kg,
          all_sets_completed: row.all_sets_completed,
          rpe:                row.rpe,
        },
        goal,
        difficultyLevel,
        false,
      );
      map[row.exercise_name] = { ...next, weight: next.weight ?? row.weight_kg };
    }
    return map;
  }

  static async computeAndStoreProgression(userId, exerciseName, logData) {
    try {
      const numericUserId = Number(userId);
      const { rows } = await pool.query(
        `SELECT id, workout_plan, mesocycle_week FROM plans
         WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (!rows.length) return null;

      const plan         = rows[0].workout_plan;
      const planId       = rows[0].id;
      const week         = rows[0].mesocycle_week || 1;
      const isNextDeload = (week % 4) === 3;

      const profile = await ProfileModel.findByUserId(numericUserId);
      const goal    = profile?.goal || 'maintain_fitness';
      const diff    = 2;

      const nextTargets = computeProgression(logData, goal, diff, isNextDeload);

      const existing = plan.progression_targets || {};
      const updated  = { ...existing, [exerciseName]: nextTargets };

      await pool.query(
        `UPDATE plans
         SET workout_plan = workout_plan || jsonb_build_object('progression_targets', $1::jsonb)
         WHERE id = $2`,
        [JSON.stringify(updated), planId]
      );

      return nextTargets;
    } catch (err) {
      console.error('WorkoutService:computeAndStoreProgression', err);
      return null;
    }
  }

  // ── CORE METHOD (handles both plan generator shapes) ────────────────────────
  static async getWorkoutForDate(userId, date = new Date()) {
    try {
      const numericUserId = Number(userId);
      if (!numericUserId || isNaN(numericUserId)) throw new Error('Invalid userId');

      const dayKey  = getTodayKey(new Date(date));  // e.g. "thursday"
      const dayIdx  = new Date(date).getDay();       // 0=Sun … 6=Sat
      const dateStr = date instanceof Date ? toLocalDateStr(date) : date;

      const { rows: planRows } = await pool.query(
        `SELECT workout_plan, mesocycle_week, generated_at FROM plans
         WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (!planRows.length || !planRows[0].workout_plan) return null;

      const rawPlan        = planRows[0].workout_plan;
      const mesocycleWeek  = planRows[0].mesocycle_week || 1;
      const planGeneratedAt = planRows[0].generated_at ?? null;

      // ── Detect which generator produced this plan ──────────────────────
      // Shape A = plan.generator.js  → Array of week objects
      // Shape B = workout.generator.js → Object with weekly_plan key
      const isShapeA = Array.isArray(rawPlan);
      const isShapeB = !isShapeA && rawPlan && typeof rawPlan === 'object' && rawPlan.weekly_plan;

      // Only count logs created after the current plan was generated.
      // This prevents stale logs from a previous plan showing as "done"
      // on the new plan, while preserving history in the calendar.
      const { rows: logRows } = await pool.query(
        `SELECT exercise_name, sets_completed, reps_completed, weight_used,
                duration_minutes, perceived_exertion, fatigue_level, notes,
                all_sets_completed, created_at
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date = $2::date
           AND ($3::timestamptz IS NULL OR created_at >= $3::timestamptz)
         ORDER BY created_at`,
        [numericUserId, dateStr, planGeneratedAt]
      );

      const exerciseLogs = logRows.map(row => ({
        exercise_name:      row.exercise_name,
        sets_completed:     row.sets_completed,
        reps_completed:     row.reps_completed,
        weight_used:        row.weight_used,
        duration_minutes:   row.duration_minutes,
        perceived_exertion: row.perceived_exertion,
        fatigue_level:      row.fatigue_level,
        notes:              row.notes,
        all_sets_completed: row.all_sets_completed,
        logged_at:          row.created_at,
      }));

      // ══════════════════════════════════════════════════════════════════════
      // SHAPE A — plan.generator.js / PlanService
      // workout_plan is: [ { week, focus, is_deload, workouts: [ { split, variation, exercises[], muscle_groups[], estimated_kcal_burned } ] } ]
      // ══════════════════════════════════════════════════════════════════════
      if (isShapeA) {
        const weekEntry = rawPlan.find(w => w.week === mesocycleWeek) ?? rawPlan[0];
        if (!weekEntry) return null;

        const { workouts = [], is_deload = false } = weekEntry;

        // Map workouts to day slots using the same pattern as Plans.jsx
        const count   = Math.min(workouts.length, 6);
        const slots   = DAY_PATTERNS[count] ?? DAY_PATTERNS[5];
        const slotIdx = slots.indexOf(dayIdx);

        const isRestDay    = slotIdx === -1;
        const todayWorkout = isRestDay ? null : (workouts[slotIdx] ?? null);

        // ── FIX: determine rest day FIRST, only use logs for workout days ──
        let exercises;
        if (isRestDay) {
          // Rest day — never show logged exercises as today's workout
          exercises = [];
        } else if (exerciseLogs.length > 0) {
          // Workout day — user already logged today, show logged data
          exercises = exerciseLogs.map(log => ({
            name:               log.exercise_name,
            sets:               log.sets_completed ?? '—',
            reps:               log.reps_completed ?? '—',
            weight_kg:          log.weight_used ?? 0,
            all_sets_completed: log.all_sets_completed,
            done:               true,
          }));
        } else if (todayWorkout) {
          // Workout day — show planned exercises
          exercises = (todayWorkout.exercises ?? []).map(ex => ({
            name:             ex.name,
            sets:             ex.sets,
            reps:             ex.reps,
            weight_kg:        ex.weight_kg ?? 0,
            rest_seconds:     ex.rest_seconds ?? null,
            estimated_kcal:   ex.est_kcal ?? ex.estimated_kcal ?? 0,
            progression_note: ex.progression_note ?? null,
            is_deload:        ex.deload ?? is_deload,
            tier:             ex.tier ?? null,
            isCardio:         ex.isCardio ?? false,
            duration:         ex.duration_min
              ? `${ex.duration_min} min`
              : ex.duration_sec
                ? `${ex.duration_sec}s`
                : null,
            done:             false,
          }));
        } else {
          exercises = [];
        }

        const muscleGroups  = todayWorkout?.muscle_groups ?? [];
        const estimatedKcal = todayWorkout?.estimated_kcal_burned
          ?? exercises.reduce((s, e) => s + (e.estimated_kcal || 0), 0);

        return {
          name:           isRestDay ? 'Rest & Recovery' : (todayWorkout?.split ?? 'Workout'),
          isRestDay,
          day:            dayKey,
          date:           dateStr,
          mesocycle_week: mesocycleWeek,
          is_deload_week: is_deload,
          rotation_tier:  todayWorkout?.variation ?? 'A',
          duration:       '45–60 min',
          difficulty:     is_deload ? 'Deload' : 'Intermediate',
          muscle_groups:  muscleGroups,
          exercises,
          completed:      !isRestDay && exerciseLogs.length > 0,
          exercise_logs:  isRestDay ? [] : exerciseLogs,
          estimated_kcal: estimatedKcal,
          meta:           weekEntry,
          guidelines:     {},
          safety_notes:   [],
        };
      }

      // ══════════════════════════════════════════════════════════════════════
      // SHAPE B — workout.generator.js / WorkoutService._generateAndStoreMesocycle
      // workout_plan is: { weekly_plan: { monday: [...] }, daily_exercises: { monday: [...] }, meta: {} }
      // ══════════════════════════════════════════════════════════════════════
      if (isShapeB) {
        const plan = rawPlan;

        let weeklyPlan     = plan.weekly_plan     ?? {};
        let dailyExercises = plan.daily_exercises ?? {};

        if (typeof weeklyPlan     === 'string') { try { weeklyPlan     = JSON.parse(weeklyPlan);     } catch { weeklyPlan     = {}; } }
        if (typeof dailyExercises === 'string') { try { dailyExercises = JSON.parse(dailyExercises); } catch { dailyExercises = {}; } }

        const todayMuscleGroups = weeklyPlan[dayKey] ?? [];
        const isRestDay         = this._isRestDay(todayMuscleGroups);

        // ── FIX: determine rest day FIRST, only use logs for workout days ──
        let exercises;
        if (isRestDay) {
          // Rest day — never show logged exercises as today's workout
          exercises = [];
        } else if (exerciseLogs.length > 0) {
          exercises = exerciseLogs.map(log => ({
            name:               log.exercise_name,
            sets:               log.sets_completed ?? '—',
            reps:               log.reps_completed ?? '—',
            weight_kg:          log.weight_used ?? 0,
            all_sets_completed: log.all_sets_completed,
            done:               true,
          }));
        } else if (dailyExercises[dayKey]?.length) {
          exercises = dailyExercises[dayKey].map(ex => ({
            name:             ex.name,
            sets:             ex.sets,
            reps:             ex.reps,
            weight_kg:        ex.weight_kg || 0,
            rest_seconds:     ex.rest_seconds,
            estimated_kcal:   ex.estimated_kcal,
            progression_note: ex.progression_note,
            is_deload:        ex.is_deload,
            tier:             ex.tier,
            done:             false,
          }));
        } else {
          exercises = this._buildExerciseList(todayMuscleGroups, plan.workout_details, []);
        }

        const estimatedSessionKcal = this._estimateSessionKcal(todayMuscleGroups, exercises);

        return {
          name:           this._buildWorkoutName(todayMuscleGroups),
          isRestDay,
          day:            dayKey,
          date:           dateStr,
          mesocycle_week: mesocycleWeek,
          is_deload_week: plan.meta?.is_deload_week || false,
          rotation_tier:  plan.meta?.rotation_tier  || 'A',
          duration:       plan.workout_details?.cardio_guidance?.duration ?? '45–60 min',
          difficulty:     this._mapIntensityLabel(plan.meta?.intensity),
          muscle_groups:  todayMuscleGroups,
          exercises,
          completed:      !isRestDay && exerciseLogs.length > 0,
          exercise_logs:  isRestDay ? [] : exerciseLogs,
          estimated_kcal: estimatedSessionKcal,
          meta:           plan.meta       || {},
          guidelines:     plan.guidelines || {},
          safety_notes:   plan.safety_notes || [],
        };
      }

      // ── Unknown shape — return rest day rather than crashing ──────────
      console.warn('WorkoutService:getWorkoutForDate — unrecognised workout_plan shape', typeof rawPlan);
      return {
        name:           'Rest & Recovery',
        isRestDay:      true,
        day:            dayKey,
        date:           dateStr,
        mesocycle_week: mesocycleWeek,
        is_deload_week: false,
        rotation_tier:  'A',
        duration:       '—',
        difficulty:     '—',
        muscle_groups:  [],
        exercises:      [],
        completed:      false,
        exercise_logs:  [],
        estimated_kcal: 0,
        meta:           {},
        guidelines:     {},
        safety_notes:   [],
      };

    } catch (err) {
      console.error('WorkoutService:getWorkoutForDate', err);
      throw err;
    }
  }

  static async getWeeklyInsights(userId) {
    try {
      const numericUserId = Number(userId);
      const insights      = [];

      const { rows: weekRows } = await pool.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN workout_date >= DATE_TRUNC('week', CURRENT_DATE) THEN workout_date END)       AS this_week,
           COUNT(DISTINCT CASE WHEN workout_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
                                AND workout_date <  DATE_TRUNC('week', CURRENT_DATE) THEN workout_date END)       AS last_week
         FROM workout_logs WHERE user_id = $1
           AND workout_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'`,
        [numericUserId]
      );
      const thisWeek = Number(weekRows[0]?.this_week || 0);
      const lastWeek = Number(weekRows[0]?.last_week || 0);

      insights.push({
        type:    'consistency',
        message: `You completed ${thisWeek} workout${thisWeek !== 1 ? 's' : ''} this week.${lastWeek > 0 ? ` (Last week: ${lastWeek})` : ''}`,
        icon:    '📅',
      });

      if (lastWeek > 0 && thisWeek !== lastWeek) {
        const delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        if (Math.abs(delta) >= 10) {
          insights.push({
            type:    'trend',
            message: delta > 0
              ? `Your consistency improved ${delta}% from last week. Keep it up! 🔥`
              : `Consistency dropped ${Math.abs(delta)}% from last week. Aim for ${lastWeek + 1} sessions this week.`,
            icon:    delta > 0 ? '📈' : '📉',
          });
        }
      }

      const { rows: lastWorkout } = await pool.query(
        `SELECT workout_date, array_agg(exercise_name) AS exercises
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date = (SELECT MAX(workout_date) FROM workout_logs WHERE user_id = $1)
         GROUP BY workout_date`,
        [numericUserId]
      );
      if (lastWorkout.length) {
        const exerciseNames = lastWorkout[0].exercises;
        const profile       = await ProfileModel.findByUserId(numericUserId);
        const bodyWeight    = profile?.body_weight_kg || 70;
        const totalKcal     = exerciseNames.reduce((sum, name) => {
          return sum + estimateCaloriesBurned(name, 3, 12, 60, bodyWeight);
        }, 0);
        insights.push({
          type:    'calories',
          message: `Your last workout burned an estimated ${totalKcal} kcal.`,
          icon:    '🔥',
        });
      }

      const streak = await this._getCurrentStreak(numericUserId);
      if (streak >= 3) {
        insights.push({
          type:    'streak',
          message: streak >= 7
            ? `🏆 ${streak}-day workout streak! You're in the top tier of consistency.`
            : `You're on a ${streak}-day streak — ${7 - streak} more days to hit your first weekly milestone.`,
          icon:    '🔥',
        });
      }

      const volumeDeltas = await WorkoutModel.getWeeklyVolumeDelta(numericUserId);
      const topGainer    = volumeDeltas.find(r => r.delta_pct > 0);
      if (topGainer) {
        insights.push({
          type:    'volume',
          message: `${topGainer.exercise_name} volume up ${topGainer.delta_pct}% this week. Progressive overload working!`,
          icon:    '💪',
        });
      }

      const { rows: muscleRows } = await pool.query(
        `SELECT exercise_name, MAX(workout_date) AS last_trained
         FROM workout_logs
         WHERE user_id = $1 AND workout_date >= CURRENT_DATE - INTERVAL '14 days'
         GROUP BY exercise_name
         ORDER BY last_trained ASC
         LIMIT 1`,
        [numericUserId]
      );
      if (muscleRows.length) {
        const daysSince = Math.floor(
          (Date.now() - new Date(muscleRows[0].last_trained).getTime()) / 86400000
        );
        if (daysSince >= 5) {
          insights.push({
            type:    'gap',
            message: `${muscleRows[0].exercise_name} hasn't been trained in ${daysSince} days. Consider adding it back this week.`,
            icon:    '⚠️',
          });
        }
      }

      const { rows: recentPRs } = await pool.query(
        `SELECT exercise_name, best_1rm, achieved_at FROM exercise_prs
         WHERE user_id = $1 AND achieved_at >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY achieved_at DESC LIMIT 3`,
        [numericUserId]
      );
      for (const pr of recentPRs) {
        insights.push({
          type:    'pr',
          message: `New PR on ${pr.exercise_name}! Estimated 1RM: ${pr.best_1rm} kg 🏅`,
          icon:    '🏅',
        });
      }

      return insights;
    } catch (err) {
      console.error('WorkoutService:getWeeklyInsights', err);
      return [];
    }
  }

  static async getProgressDashboard(userId, days = 30) {
    try {
      const numericUserId = Number(userId);

      const [volumeStats, prs, weeklyDelta, streak, stats] = await Promise.all([
        WorkoutModel.getVolumeStats(numericUserId, days),
        WorkoutModel.getExercisePRs(numericUserId),
        WorkoutModel.getWeeklyVolumeDelta(numericUserId),
        this._getCurrentStreak(numericUserId),
        WorkoutModel.getWorkoutStats(numericUserId, days),
      ]);

      const { rows: strengthTrend } = await pool.query(
        `SELECT
           exercise_name,
           MAX(weight_used * (1 + reps_completed / 30.0)) FILTER (WHERE workout_date >= CURRENT_DATE - INTERVAL '7 days')  AS recent_1rm,
           MAX(weight_used * (1 + reps_completed / 30.0)) FILTER (WHERE workout_date < CURRENT_DATE - INTERVAL '7 days')   AS older_1rm
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval
           AND weight_used > 0 AND reps_completed > 0
         GROUP BY exercise_name
         HAVING MAX(weight_used) > 0
         ORDER BY recent_1rm DESC NULLS LAST
         LIMIT 5`,
        [numericUserId, days]
      );

      const strengthImprovements = strengthTrend
        .filter(r => r.recent_1rm && r.older_1rm)
        .map(r => ({
          exercise_name:   r.exercise_name,
          recent_1rm:      toNum(r.recent_1rm, 1),
          older_1rm:       toNum(r.older_1rm, 1),
          improvement_pct: toNum(((r.recent_1rm - r.older_1rm) / r.older_1rm) * 100, 1),
        }));

      const { rows: heatmapRows } = await pool.query(
        `SELECT workout_date::text AS date, COUNT(DISTINCT exercise_name) AS exercise_count
         FROM workout_logs
         WHERE user_id = $1 AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval
         GROUP BY workout_date ORDER BY workout_date`,
        [numericUserId, days]
      );

      return {
        period_days:           days,
        workouts_completed:    Number(stats.total_workout_days || 0),
        total_exercises:       Number(stats.total_exercises || 0),
        total_volume_kg:       toNum(stats.total_volume_kg, 2),
        total_minutes:         Number(stats.total_minutes || 0),
        avg_rpe:               toNum(stats.avg_exertion, 1),
        current_streak:        streak,
        volume_by_exercise:    volumeStats,
        weekly_volume_delta:   weeklyDelta,
        personal_records:      prs,
        strength_improvements: strengthImprovements,
        workout_heatmap:       heatmapRows,
      };
    } catch (err) {
      console.error('WorkoutService:getProgressDashboard', err);
      throw err;
    }
  }

  static async adaptNutritionTargets(userId) {
    try {
      const numericUserId = Number(userId);
      const profile       = await ProfileModel.findByUserId(numericUserId);
      if (!profile) return null;

      const goal           = profile.goal;
      const originalTarget = profile.calorie_target || 2000;

      const { rows: weightRows } = await pool.query(
        `SELECT logged_date::text AS date, weight_kg
         FROM weight_logs
         WHERE user_id = $1 AND logged_date >= CURRENT_DATE - INTERVAL '14 days'
         ORDER BY logged_date DESC`,
        [numericUserId]
      );

      const { rows: completionRows } = await pool.query(
        `SELECT
           COUNT(DISTINCT workout_date)                                     AS days_logged,
           COUNT(DISTINCT CASE WHEN all_sets_completed = true THEN workout_date END) AS days_completed
         FROM workout_logs
         WHERE user_id = $1 AND workout_date >= CURRENT_DATE - INTERVAL '14 days'`,
        [numericUserId]
      );

      const daysLogged     = Number(completionRows[0]?.days_logged   || 0);
      const daysCompleted  = Number(completionRows[0]?.days_completed || 0);
      const completionRate = daysLogged > 0 ? daysCompleted / daysLogged : 0;

      let adjustment    = 0;
      let reason        = 'no_change';
      let flagForReview = false;

      if (goal === 'weight_loss' && weightRows.length >= 2) {
        const newest     = weightRows[0].weight_kg;
        const oldest     = weightRows[weightRows.length - 1].weight_kg;
        const weeklyDelta = (newest - oldest) / 2;

        if (weeklyDelta >= 0)   { adjustment = -125; reason = 'weight_not_dropping'; }
        else if (weeklyDelta < -1.5) { adjustment = +100; reason = 'weight_dropping_too_fast'; }
      }

      if (goal === 'muscle_gain' && completionRate < 0.6) {
        flagForReview = true;
        reason        = 'low_completion_rate';
      }

      const { rows: nutritionRows } = await pool.query(
        `SELECT id, calorie_target, original_calorie_target
         FROM nutrition_plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (!nutritionRows.length) return null;

      const currentTarget = nutritionRows[0].calorie_target;
      const originalBase  = nutritionRows[0].original_calorie_target || originalTarget;
      const maxDeviation  = 300;

      const proposed        = currentTarget + adjustment;
      const capped          = Math.min(Math.max(proposed, originalBase - maxDeviation), originalBase + maxDeviation);
      const actualAdjustment = capped - currentTarget;

      if (actualAdjustment !== 0 && !flagForReview) {
        await pool.query(
          `UPDATE nutrition_plans SET calorie_target = $1, updated_at = NOW() WHERE id = $2`,
          [capped, nutritionRows[0].id]
        );
        await pool.query(
          `INSERT INTO nutrition_adjustments (user_id, previous_target, new_target, reason, adjusted_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [numericUserId, currentTarget, capped, reason]
        );
      }

      return {
        previous_target:  currentTarget,
        new_target:       actualAdjustment !== 0 && !flagForReview ? capped : currentTarget,
        adjustment:       actualAdjustment,
        reason,
        flag_for_review:  flagForReview,
        completion_rate:  toNum(completionRate * 100, 1),
      };
    } catch (err) {
      console.error('WorkoutService:adaptNutritionTargets', err);
      return null;
    }
  }

  // ── Standard service methods ─────────────────────────────────────────────────

  static async getWorkoutHistory(userId, options = {}) {
    try {
      const numericUserId = Number(userId);
      const { limit = 30, offset = 0, startDate, endDate, completedOnly = false } = options;

      let query = `SELECT workout_date::text AS date,
                          exercise_name, sets_completed, reps_completed,
                          weight_used, duration_minutes, perceived_exertion,
                          fatigue_level, notes, all_sets_completed, created_at, updated_at
                   FROM workout_logs WHERE user_id = $1`;
      const params = [numericUserId];
      let idx = 2;

      if (startDate)     { query += ` AND workout_date >= $${idx++}`; params.push(startDate); }
      if (endDate)       { query += ` AND workout_date <= $${idx++}`; params.push(endDate); }
      if (completedOnly) query += ` AND sets_completed IS NOT NULL AND sets_completed > 0`;

      query += ` ORDER BY workout_date DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
      params.push(limit, offset);

      const { rows } = await pool.query(query, params);
      return rows;
    } catch (err) {
      console.error('WorkoutService:getWorkoutHistory', err);
      throw err;
    }
  }

  static async getWorkoutHistoryCount(userId, options = {}) {
    try {
      const numericUserId = Number(userId);
      const { startDate = null, endDate = null, completedOnly = false } = options;
      let query = `SELECT COUNT(*)::int as total FROM workout_logs WHERE user_id = $1`;
      const params = [numericUserId];
      let idx = 2;
      if (startDate)     { query += ` AND workout_date >= $${idx++}`; params.push(startDate); }
      if (endDate)       { query += ` AND workout_date <= $${idx++}`; params.push(endDate); }
      if (completedOnly) query += ` AND sets_completed IS NOT NULL AND sets_completed > 0`;
      const { rows } = await pool.query(query, params);
      return rows[0].total;
    } catch { return 0; }
  }

  static async getWorkoutStats(userId, { days = 30 } = {}) {
    try {
      const numericUserId = Number(userId);
      const { rows: dateRows } = await pool.query(
        `SELECT DISTINCT workout_date FROM workout_logs
         WHERE user_id = $1 AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval`,
        [numericUserId, days]
      );
      const { rows: statsRows } = await pool.query(
        `SELECT COALESCE(SUM(duration_minutes), 0)                                          AS total_minutes,
                COALESCE(SUM(sets_completed * reps_completed * COALESCE(weight_used,0)), 0) AS total_volume_kg
         FROM workout_logs
         WHERE user_id = $1 AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval`,
        [numericUserId, days]
      );
      return {
        period_days:        days,
        workouts_completed: dateRows.length,
        total_minutes:      Number(statsRows[0].total_minutes),
        total_volume_kg:    toNum(statsRows[0].total_volume_kg, 2),
        current_streak:     await this._getCurrentStreak(numericUserId),
      };
    } catch (err) {
      console.error('WorkoutService:getWorkoutStats', err);
      throw err;
    }
  }

  static async getWeeklyPlan(userId) {
    try {
      const numericUserId = Number(userId);
      if (!numericUserId || isNaN(numericUserId)) throw new Error('Invalid userId');
      const { rows } = await pool.query(
        `SELECT workout_plan, mesocycle_week FROM plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [numericUserId]
      );
      if (!rows.length) return null;
      const plan = rows[0].workout_plan;

      // Handle both shapes for weekly plan response
      if (Array.isArray(plan)) {
        // Shape A — return a summary suitable for the weekly view
        return {
          weekly_plan:         {},
          meta:                { mesocycle_week: rows[0].mesocycle_week },
          guidelines:          {},
          safety_notes:        [],
          workout_details:     {},
          progression_targets: plan.progression_targets || {},
          schedule:            plan,   // expose the full schedule for Shape A consumers
        };
      }

      return {
        weekly_plan:         plan.weekly_plan || {},
        meta:                { ...plan.meta, mesocycle_week: rows[0].mesocycle_week },
        guidelines:          plan.guidelines || {},
        safety_notes:        plan.safety_notes || [],
        workout_details:     plan.workout_details || {},
        progression_targets: plan.progression_targets || {},
      };
    } catch (err) {
      console.error('WorkoutService:getWeeklyPlan', err);
      throw err;
    }
  }

  static async logWorkout(userId, logData) {
    const client = await pool.connect();
    try {
      const numericUserId = Number(userId);
      if (!numericUserId || isNaN(numericUserId)) throw new Error('Invalid userId');
      const {
        date = new Date(), exercise_name,
        sets_completed = null, reps_completed = null,
        weight_used = null, duration_minutes = null,
        perceived_exertion = null, fatigue_level = null,
        notes = null, all_sets_completed = false, rpe = null,
      } = logData;
      if (!exercise_name) throw new Error('exercise_name is required');
      const dateStr = date instanceof Date ? toLocalDateStr(date) : date;
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO workout_logs (user_id, workout_date, exercise_name, sets_completed,
          reps_completed, weight_used, duration_minutes, perceived_exertion, fatigue_level,
          notes, all_sets_completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [numericUserId, dateStr, exercise_name, sets_completed, reps_completed,
         weight_used, duration_minutes, rpe ?? perceived_exertion, fatigue_level,
         notes, all_sets_completed]
      );
      await client.query('COMMIT');

      setImmediate(async () => {
        await Promise.allSettled([
          WorkoutModel.updateStreak(numericUserId, dateStr),
          WorkoutModel.checkAndUpdatePR(numericUserId, exercise_name, weight_used, reps_completed, dateStr),
          this.computeAndStoreProgression(numericUserId, exercise_name, {
            sets: sets_completed, reps: reps_completed, weight: weight_used,
            all_sets_completed, rpe: rpe ?? perceived_exertion,
          }),
        ]);
      });

      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async logMultipleExercises(userId, logData) {
    const client = await pool.connect();
    try {
      const numericUserId = Number(userId);
      if (!numericUserId || isNaN(numericUserId)) throw new Error('Invalid userId');
      const {
        date = new Date(), exercises = [],
        duration_minutes = null, perceived_exertion = null,
        fatigue_level = null, notes = null,
        all_sets_completed = false, rpe = null,
      } = logData;
      if (!Array.isArray(exercises) || exercises.length === 0)
        throw new Error('exercises array is required and must not be empty');
      const dateStr = date instanceof Date ? toLocalDateStr(date) : date;
      await client.query('BEGIN');
      const insertedLogs = [];
      for (const exercise of exercises) {
        const { name, sets = null, reps = null, weight = null, notes: exNotes = null } = exercise;
        if (!name) throw new Error('Each exercise must have a name');
        const { rows } = await client.query(
          `INSERT INTO workout_logs (user_id, workout_date, exercise_name, sets_completed,
            reps_completed, weight_used, duration_minutes, perceived_exertion, fatigue_level,
            notes, all_sets_completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [numericUserId, dateStr, name, sets, reps, weight,
           duration_minutes, rpe ?? perceived_exertion, fatigue_level,
           exNotes ?? notes, all_sets_completed]
        );
        insertedLogs.push(rows[0]);
      }
      await client.query('COMMIT');

      setImmediate(async () => {
        await WorkoutModel.updateStreak(numericUserId, dateStr);
        for (const log of insertedLogs) {
          await Promise.allSettled([
            WorkoutModel.checkAndUpdatePR(numericUserId, log.exercise_name, log.weight_used, log.reps_completed, dateStr),
            this.computeAndStoreProgression(numericUserId, log.exercise_name, {
              sets: log.sets_completed, reps: log.reps_completed, weight: log.weight_used,
              all_sets_completed, rpe: rpe ?? perceived_exertion,
            }),
          ]);
        }
      });

      return insertedLogs;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async _getCurrentStreak(userId) {
    try {
      const { rows } = await pool.query(
        `WITH RECURSIVE workout_dates AS (
           SELECT DISTINCT workout_date FROM workout_logs WHERE user_id = $1
         ),
         start_date AS (
           SELECT CASE
             WHEN EXISTS (SELECT 1 FROM workout_dates WHERE workout_date = CURRENT_DATE)
               THEN CURRENT_DATE
             WHEN EXISTS (SELECT 1 FROM workout_dates WHERE workout_date = CURRENT_DATE - INTERVAL '1 day')
               THEN CURRENT_DATE - INTERVAL '1 day'
             ELSE NULL
           END AS base_date
         ),
         streak AS (
           SELECT workout_date FROM workout_dates
           WHERE workout_date = (SELECT base_date FROM start_date)
             AND (SELECT base_date FROM start_date) IS NOT NULL
           UNION ALL
           SELECT w.workout_date FROM workout_dates w
           JOIN streak s ON w.workout_date = s.workout_date - INTERVAL '1 day'
         )
         SELECT COUNT(*)::int AS streak FROM streak`,
        [userId]
      );
      return rows[0]?.streak ?? 0;
    } catch { return 0; }
  }

  static async deleteWorkoutLog(userId, logId) {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM workout_logs WHERE user_id = $1 AND id = $2`,
        [Number(userId), logId]
      );
      return rowCount > 0;
    } catch (err) {
      console.error('WorkoutService:deleteWorkoutLog', err);
      throw err;
    }
  }

  static async hasActivePlan(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM plans WHERE user_id = $1 AND is_active = true) as has_plan`,
        [Number(userId)]
      );
      return rows[0].has_plan;
    } catch { return false; }
  }

  static async getWeekSummary(userId) {
    try {
      const numericUserId = Number(userId);
      const { rows } = await pool.query(
        `SELECT workout_date::text AS date,
                COUNT(*) as exercises_logged,
                SUM(duration_minutes) as total_duration,
                SUM(sets_completed * reps_completed * COALESCE(weight_used,0)) AS total_volume_kg
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date >= DATE_TRUNC('week', CURRENT_DATE)
           AND workout_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
         GROUP BY workout_date ORDER BY workout_date`,
        [numericUserId]
      );
      const daysOfWeek = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const summary    = {};
      daysOfWeek.forEach(day => {
        summary[day] = { completed: false, exercises_logged: 0, duration: 0, volume_kg: 0 };
      });
      rows.forEach(row => {
        const [year, month, day] = row.date.split('-').map(Number);
        const date     = new Date(year, month - 1, day);
        const dayIndex = (date.getDay() + 6) % 7;
        const dayKey   = daysOfWeek[dayIndex];
        if (summary[dayKey]) {
          summary[dayKey] = {
            completed:        true,
            exercises_logged: Number(row.exercises_logged),
            duration:         Number(row.total_duration) || 0,
            volume_kg:        toNum(row.total_volume_kg, 2),
            date:             row.date,
          };
        }
      });
      return summary;
    } catch (err) {
      console.error('WorkoutService:getWeekSummary', err);
      throw err;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  static _isRestDay(muscleGroups) {
    if (!muscleGroups?.length) return true;
    return muscleGroups.every(g => /^rest/i.test(g.trim()));
  }

  static _estimateSessionKcal(muscleGroups, exercises) {
    if (!muscleGroups?.length || this._isRestDay(muscleGroups)) return 0;
    const sumFromExercises = exercises.reduce((sum, ex) => sum + (ex.estimated_kcal || 0), 0);
    if (sumFromExercises > 0) return sumFromExercises;
    return muscleGroups.reduce((sum, focus) => sum + (FOCUS_KCAL_ESTIMATES[focus] || 200), 0);
  }

  static _buildExerciseList(muscleGroups, workoutDetails, logs) {
    if (this._isRestDay(muscleGroups)) return [];
    if (logs.length > 0) {
      return logs.map(log => ({
        name: log.exercise_name, sets: log.sets_completed ?? '—', reps: log.reps_completed ?? '—', done: true,
      }));
    }
    const exerciseMap = {
      'Chest':             [{ name: 'Bench Press', sets: 3, reps: 10 }, { name: 'Push-Ups', sets: 3, reps: 15 }],
      'Back':              [{ name: 'Pull-Ups', sets: 3, reps: 8 }, { name: 'Bent Over Row', sets: 3, reps: 10 }],
      'Biceps':            [{ name: 'Barbell Curl', sets: 3, reps: 12 }, { name: 'Hammer Curl', sets: 3, reps: 12 }],
      'Triceps':           [{ name: 'Tricep Dips', sets: 3, reps: 12 }, { name: 'Skull Crushers', sets: 3, reps: 10 }],
      'Shoulders':         [{ name: 'Overhead Press', sets: 3, reps: 10 }, { name: 'Lateral Raises', sets: 3, reps: 15 }],
      'Legs':              [{ name: 'Squats', sets: 3, reps: 12 }, { name: 'Lunges', sets: 3, reps: 10 }],
      'Lower Body':        [{ name: 'Squats', sets: 3, reps: 12 }, { name: 'Romanian Deadlift', sets: 3, reps: 10 }],
      'Upper Body':        [{ name: 'Push-Ups', sets: 3, reps: 15 }, { name: 'Dumbbell Row', sets: 3, reps: 12 }],
      'Core':              [{ name: 'Plank', sets: 3, reps: '60s' }, { name: 'Crunches', sets: 3, reps: 20 }],
      'Full Body':         [{ name: 'Deadlift', sets: 3, reps: 8 }, { name: 'Goblet Squat', sets: 3, reps: 12 }],
      'Cardio (Moderate)': [{ name: 'Brisk Walk / Jog', sets: 1, reps: '30 min' }],
    };
    const exercises = [];
    for (const group of muscleGroups) {
      const key  = Object.keys(exerciseMap).find(k => group.includes(k)) ?? group;
      const list = exerciseMap[key] ?? [{ name: group, sets: 3, reps: 10 }];
      exercises.push(...list.map(e => ({ ...e, done: false })));
    }
    return exercises;
  }

  static _buildWorkoutName(muscleGroups) {
    if (!muscleGroups?.length || this._isRestDay(muscleGroups)) return 'Rest & Recovery';
    const NAME_MAP = {
      'Cardio (Moderate)':             'HIIT Cardio',
      'Cardio (Moderate 40 min)':      'Endurance Cardio',
      'Cardio (30 min)':               'Cardio Circuit',
      'Cardio (Intervals 30–40 min)':  'Interval Training',
      'Moderate Cardio':               'Moderate Cardio',
      'Moderate Cardio (30–40 min)':   'Moderate Cardio',
      'Low-Intensity Cardio (30 min)': 'Low-Intensity Cardio',
      'Full Body Strength':            'Full Body Strength',
      'Full Body (Light)':             'Full Body (Light)',
      'Full Body':                     'Full Body',
      'Upper Body':                    'Upper Body',
      'Upper Body (Light)':            'Upper Body (Light)',
      'Upper Body (Accessory)':        'Upper Body Accessory',
      'Lower Body':                    'Lower Body',
      'Lower Body Strength':           'Lower Body Strength',
      'Legs':                          'Leg Day',
      'Legs (Light)':                  'Legs (Light)',
      'Legs (Light Strength)':         'Legs (Light)',
      'Legs (Strength + Short Cardio)':'Legs + Cardio',
      'Chest':                         'Chest Day',
      'Back':                          'Back Day',
      'Shoulders':                     'Shoulder Day',
      'Biceps':                        'Biceps',
      'Triceps':                       'Triceps',
      'Core':                          'Core Work',
    };
    const named   = muscleGroups.map(g => NAME_MAP[g.trim()] ?? g.trim());
    const deduped = named.filter((n, i) => i === 0 || n !== named[i - 1]);
    return deduped.join(' + ');
  }

  static _mapIntensityLabel(intensity) {
    const map = {
      'low':              'Beginner',
      'low-to-moderate':  'Easy',
      'moderate':         'Intermediate',
      'moderate-to-high': 'Advanced',
      'high':             'Elite',
    };
    return map[intensity] ?? 'Intermediate';
  }
}

export default WorkoutService;