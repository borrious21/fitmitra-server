// src/models/workout.model.js

import pool from '../config/db.config.js';

// Utility: safely convert any Postgres numeric/string to a JS number with fixed decimals
const toNum = (val, decimals = 1) => parseFloat(parseFloat(val || 0).toFixed(decimals));

class WorkoutModel {


  static async logWorkout(userId, data) {
    const {
      workout_date        = new Date().toISOString().split('T')[0],
      exercise_name,
      sets_completed,
      reps_completed,
      weight_used         = 0,
      duration_minutes    = 0,
      perceived_exertion  = 5,   
      fatigue_level       = 5,
      notes               = '',
      all_sets_completed  = false,   
      rpe                 = null,  
    } = data;

    const effectiveRpe = rpe ?? perceived_exertion;

    const { rows } = await pool.query(
      `INSERT INTO workout_logs (
        user_id, workout_date, exercise_name, sets_completed,
        reps_completed, weight_used, duration_minutes,
        perceived_exertion, fatigue_level, notes, all_sets_completed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId, workout_date, exercise_name, sets_completed,
        reps_completed, weight_used, duration_minutes,
        effectiveRpe, fatigue_level, notes, all_sets_completed,
      ]
    );

    await Promise.allSettled([
      this.updateStreak(userId, workout_date),
      this.checkAndUpdatePR(userId, exercise_name, weight_used, reps_completed, workout_date),
    ]);

    return rows[0];
  }

  static async checkAndUpdatePR(userId, exerciseName, weight, reps, workoutDate) {
    if (!weight || weight <= 0 || !reps || reps <= 0) {
      return { pr_broken: false };
    }

    const new1rm = parseFloat((weight * (1 + reps / 30)).toFixed(2));

    // Fetch existing PR
    const { rows: existing } = await pool.query(
      `SELECT best_weight, best_reps, best_1rm FROM exercise_prs
       WHERE user_id = $1 AND exercise_name = $2`,
      [userId, exerciseName]
    );

    const old1rm = existing[0]?.best_1rm ?? 0;
    const prBroken = new1rm > old1rm;

    if (prBroken) {
      await pool.query(
        `INSERT INTO exercise_prs (user_id, exercise_name, best_weight, best_reps, best_1rm, achieved_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, exercise_name) DO UPDATE SET
           best_weight  = EXCLUDED.best_weight,
           best_reps    = EXCLUDED.best_reps,
           best_1rm     = EXCLUDED.best_1rm,
           achieved_at  = EXCLUDED.achieved_at,
           updated_at   = NOW()`,
        [userId, exerciseName, weight, reps, new1rm, workoutDate]
      );

      await this.checkStreakAchievements(userId, null, { type: 'pr', exerciseName, new1rm });
    }

    return { pr_broken: prBroken, old_1rm: old1rm, new_1rm: new1rm };
  }

  static async getExercisePRs(userId, exerciseNames = null) {
    let query = `SELECT exercise_name, best_weight, best_reps, best_1rm, achieved_at
                 FROM exercise_prs WHERE user_id = $1`;
    const params = [userId];

    if (exerciseNames?.length) {
      query += ` AND exercise_name = ANY($2)`;
      params.push(exerciseNames);
    }

    query += ` ORDER BY achieved_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getVolumeStats(userId, days = 30) {
    const { rows } = await pool.query(
      `SELECT
         exercise_name,
         COUNT(*)                                                        AS sessions,
         SUM(sets_completed)                                             AS total_sets,
         SUM(reps_completed)                                             AS total_reps,
         SUM(sets_completed * reps_completed * COALESCE(weight_used,0)) AS total_volume_kg,
         MAX(weight_used)                                                AS max_weight,
         AVG(perceived_exertion)                                         AS avg_rpe
       FROM workout_logs
       WHERE user_id = $1
         AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval
         AND sets_completed IS NOT NULL AND sets_completed > 0
       GROUP BY exercise_name
       ORDER BY total_volume_kg DESC NULLS LAST`,
      [userId, days]
    );
    return rows.map(r => ({
      ...r,
      sessions:        Number(r.sessions),
      total_sets:      Number(r.total_sets),
      total_reps:      Number(r.total_reps),
      total_volume_kg: toNum(r.total_volume_kg, 2),
      max_weight:      toNum(r.max_weight, 2),
      avg_rpe:         toNum(r.avg_rpe, 1),
    }));
  }

  static async getWeeklyVolumeDelta(userId) {
    const { rows } = await pool.query(
      `WITH this_week AS (
         SELECT exercise_name,
                SUM(sets_completed * reps_completed * COALESCE(weight_used,0)) AS volume
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date >= DATE_TRUNC('week', CURRENT_DATE)
           AND sets_completed > 0
         GROUP BY exercise_name
       ),
       last_week AS (
         SELECT exercise_name,
                SUM(sets_completed * reps_completed * COALESCE(weight_used,0)) AS volume
         FROM workout_logs
         WHERE user_id = $1
           AND workout_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
           AND workout_date <  DATE_TRUNC('week', CURRENT_DATE)
           AND sets_completed > 0
         GROUP BY exercise_name
       )
       SELECT
         COALESCE(t.exercise_name, l.exercise_name) AS exercise_name,
         COALESCE(t.volume, 0)                       AS this_week_volume,
         COALESCE(l.volume, 0)                       AS last_week_volume,
         CASE WHEN COALESCE(l.volume,0) = 0 THEN NULL
              ELSE ROUND(((COALESCE(t.volume,0) - COALESCE(l.volume,0)) / COALESCE(l.volume,1) * 100)::numeric, 1)
         END AS delta_pct
       FROM this_week t FULL OUTER JOIN last_week l USING (exercise_name)
       ORDER BY this_week_volume DESC`,
      [userId]
    );
    return rows;
  }

  static async getWorkoutHistory(userId, filters = {}) {
    const { start_date, end_date, exercise_name, limit = 50, offset = 0, completed_only = false } = filters;

    let query = `SELECT * FROM workout_logs WHERE user_id = $1`;
    const params = [userId];
    let paramCount = 1;

    if (start_date)    { params.push(start_date);          query += ` AND workout_date >= $${++paramCount}`; }
    if (end_date)      { params.push(end_date);            query += ` AND workout_date <= $${++paramCount}`; }
    if (exercise_name) { params.push(`%${exercise_name}%`);query += ` AND exercise_name ILIKE $${++paramCount}`; }
    if (completed_only) query += ` AND sets_completed IS NOT NULL AND sets_completed > 0`;

    query += ` ORDER BY workout_date DESC, created_at DESC`;
    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getWorkoutStats(userId, days = 30) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(DISTINCT workout_date)                                        AS total_workout_days,
         COUNT(*)                                                            AS total_exercises,
         AVG(perceived_exertion)                                             AS avg_exertion,
         AVG(duration_minutes)                                               AS avg_duration,
         SUM(duration_minutes)                                               AS total_minutes,
         SUM(sets_completed * reps_completed * COALESCE(weight_used,0))     AS total_volume_kg,
         array_agg(DISTINCT exercise_name ORDER BY exercise_name)           AS exercises_done
       FROM workout_logs
       WHERE user_id = $1
         AND workout_date >= CURRENT_DATE - ($2 || ' days')::interval`,
      [userId, days]
    );
    return rows[0];
  }

  static async updateStreak(userId, workoutDate) {
    const { rows: streakRows } = await pool.query(
      `SELECT * FROM user_streaks WHERE user_id = $1`,
      [userId]
    );

    const today = new Date(workoutDate);
    let currentStreak = 1, longestStreak = 1, totalWorkouts = 1;

    if (streakRows.length > 0) {
      const streak   = streakRows[0];
      const lastDate = streak.last_workout_date ? new Date(streak.last_workout_date) : null;

      if (lastDate) {
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return streak;
        else if (diffDays === 1) currentStreak = streak.current_workout_streak + 1;
        else currentStreak = 1;
      }

      longestStreak = Math.max(currentStreak, streak.longest_workout_streak);
      totalWorkouts = streak.total_workouts + 1;
      await this.checkStreakAchievements(userId, currentStreak);
    }

    const { rows } = await pool.query(
      `INSERT INTO user_streaks (
         user_id, current_workout_streak, longest_workout_streak,
         last_workout_date, total_workouts
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         current_workout_streak = $2,
         longest_workout_streak = $3,
         last_workout_date      = $4,
         total_workouts         = $5,
         updated_at             = NOW()
       RETURNING *`,
      [userId, currentStreak, longestStreak, workoutDate, totalWorkouts]
    );
    return rows[0];
  }

  static async checkStreakAchievements(userId, streak, extra = null) {
    const milestones = [
      { days: 7,   name: 'Week Warrior',        type: 'workout_streak_7' },
      { days: 30,  name: 'Monthly Master',       type: 'workout_streak_30' },
      { days: 60,  name: 'Consistency Champion', type: 'workout_streak_60' },
      { days: 100, name: 'Century Athlete',      type: 'workout_streak_100' },
    ];

    if (streak !== null) {
      for (const m of milestones) {
        if (streak === m.days) {
          await this.awardAchievement(userId, m.type, m.name, { streak_days: streak });
        }
      }
    }

    // PR achievement
    if (extra?.type === 'pr') {
      await this.awardAchievement(userId, `pr_${extra.exerciseName.replace(/\s+/g, '_').toLowerCase()}`, `PR: ${extra.exerciseName}`, { est_1rm: extra.new1rm });
    }
  }

  static async awardAchievement(userId, type, name, metadata = {}) {
    const { rows } = await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, achievement_type) DO NOTHING
       RETURNING *`,
      [userId, type, name, JSON.stringify(metadata)]
    );
    return rows[0];
  }

  static async getUserAchievements(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM user_achievements WHERE user_id = $1 ORDER BY earned_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getUserStreak(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM user_streaks WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || { current_workout_streak: 0, longest_workout_streak: 0, total_workouts: 0 };
  }

  static async countWorkoutLogs() {
    const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM workout_logs`);
    return Number(rows[0].total);
  }

  static async activeUsersLastDays(days = 30) {
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT user_id) AS total FROM workout_logs
       WHERE workout_date >= CURRENT_DATE - ($1 || ' days')::interval`,
      [days]
    );
    return Number(rows[0].total);
  }

  static async avgWorkoutDurationLastDays(days = 30) {
    const { rows } = await pool.query(
      `SELECT AVG(duration_minutes) AS avg_duration FROM workout_logs
       WHERE workout_date >= CURRENT_DATE - ($1 || ' days')::interval`,
      [days]
    );
    return Number(rows[0].avg_duration);
  }

  static async deleteWorkout(userId, workoutId) {
    const { rowCount } = await pool.query(
      `DELETE FROM workout_logs WHERE id = $1 AND user_id = $2`,
      [workoutId, userId]
    );
    return rowCount > 0;
  }
}

export default WorkoutModel;