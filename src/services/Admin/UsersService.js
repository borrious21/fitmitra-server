// admin/services/usersService.js
import pool from "../../config/db.config.js";

export const getAllUsers = async ({ limit = 50, offset = 0, search = "", role = "" }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }
  if (role) {
    params.push(role);
    where += ` AND u.role = $${params.length}`;
  }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT
       u.id, u.name, u.email, u.role, u.is_verified,
       u.is_active, u.has_completed_onboarding, u.created_at,
       p.goal, p.weight_kg, p.activity_level,
       up.avatar_url
     FROM users u
     LEFT JOIN profiles p          ON p.user_id  = u.id
     LEFT JOIN user_preferences up ON up.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM users u ${where}`,
    params.slice(0, params.length - 2)
  );

  return {
    users: rows.map(r => ({
      id:                       r.id,
      name:                     r.name,
      email:                    r.email,
      role:                     r.role,
      is_active:                r.is_active,
      is_verified:              r.is_verified,
      has_completed_onboarding: r.has_completed_onboarding,
      created_at:               r.created_at,
      avatar_url:               r.avatar_url ?? null,
      profile: {
        goal:           r.goal,
        weight_kg:      r.weight_kg,
        activity_level: r.activity_level,
      },
    })),
    total: Number(countRows[0].count),
  };
};

export const getUserById = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       u.id, u.name, u.email, u.role, u.is_verified,
       u.is_active, u.has_completed_onboarding, u.created_at, u.updated_at,
       p.age, p.gender, p.height_cm, p.weight_kg,
       p.goal, p.activity_level, p.diet_type, p.medical_conditions,
       up.avatar_url, up.sleep_goal_hours, up.water_goal_liters
     FROM users u
     LEFT JOIN profiles p          ON p.user_id  = u.id
     LEFT JOIN user_preferences up ON up.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (!rows.length) return null;
  const u = rows[0];

  const { rows: weightRows } = await pool.query(
    `SELECT weight_kg, logged_date
     FROM weight_logs
     WHERE user_id = $1 AND logged_date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY logged_date DESC LIMIT 10`,
    [userId]
  );

  const { rows: workoutRows } = await pool.query(
    `SELECT
       COUNT(*)::int                              AS total_sessions,
       COUNT(DISTINCT workout_date)::int          AS unique_days,
       MAX(workout_date)                          AS last_workout,
       ROUND(AVG(perceived_exertion), 1)          AS avg_exertion
     FROM workout_logs WHERE user_id = $1`,
    [userId]
  );

  const { rows: mealRows } = await pool.query(
    `SELECT
       COUNT(DISTINCT log_date)::int                AS days_logged,
       ROUND(AVG(daily_cal))::int                   AS avg_daily_calories,
       ROUND(AVG(daily_prot), 1)                    AS avg_daily_protein
     FROM (
       SELECT log_date,
         SUM(calories_consumed) AS daily_cal,
         SUM(protein_g)         AS daily_prot
       FROM meal_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY log_date
     ) sub`,
    [userId]
  );

  const { rows: streakRows } = await pool.query(
    `SELECT current_workout_streak, longest_workout_streak, total_workouts
     FROM user_streaks WHERE user_id = $1`,
    [userId]
  );

  const { rows: prRows } = await pool.query(
    `SELECT exercise_name, best_1rm, best_reps, achieved_at
     FROM exercise_prs WHERE user_id = $1
     ORDER BY achieved_at DESC LIMIT 5`,
    [userId]
  );

  const { rows: planRows } = await pool.query(
    `SELECT id, goals, duration_weeks, mesocycle_week
     FROM plans WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
    [userId]
  );

  const { rows: achRows } = await pool.query(
    `SELECT achievement_name, earned_at
     FROM user_achievements WHERE user_id = $1
     ORDER BY earned_at DESC LIMIT 8`,
    [userId]
  );

  const ws = workoutRows[0] ?? {};
  const ns = mealRows[0]   ?? {};
  const st = streakRows[0] ?? {};

  return {
    id:                       u.id,
    name:                     u.name,
    email:                    u.email,
    role:                     u.role,
    is_active:                u.is_active,
    is_verified:              u.is_verified,
    has_completed_onboarding: u.has_completed_onboarding,
    created_at:               u.created_at,
    updated_at:               u.updated_at,
    avatar_url:               u.avatar_url ?? null,

    profile: {
      age:                u.age,
      gender:             u.gender,
      height_cm:          u.height_cm,
      weight_kg:          u.weight_kg,
      goal:               u.goal,
      activity_level:     u.activity_level,
      diet_type:          u.diet_type,
      medical_conditions: u.medical_conditions,
      sleep_goal_hours:   u.sleep_goal_hours,
      water_goal_liters:  u.water_goal_liters,
    },

    weight_logs: weightRows,

    workout_stats: {
      total_sessions: ws.total_sessions ?? 0,
      unique_days:    ws.unique_days    ?? 0,
      last_workout:   ws.last_workout   ?? null,
      avg_exertion:   ws.avg_exertion   ?? null,
    },

    nutrition_stats: {
      days_logged:        ns.days_logged        ?? 0,
      avg_daily_calories: ns.avg_daily_calories ?? 0,
      avg_daily_protein:  ns.avg_daily_protein  ?? 0,
    },

    streak: {
      current: st.current_workout_streak ?? 0,
      longest: st.longest_workout_streak ?? 0,
      total:   st.total_workouts         ?? 0,
    },

    personal_records: prRows,
    active_plan:      planRows[0] ?? null,
    achievements:     achRows,
  };
};

export const banUser = async (userId) => {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, is_active`,
    [userId]
  );
  return rows[0] || null;
};

export const activateUser = async (userId) => {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = true, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, is_active`,
    [userId]
  );
  return rows[0] || null;
};

export const verifyUser = async (userId) => {
  const { rows } = await pool.query(
    `UPDATE users SET is_verified = true, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, is_verified`,
    [userId]
  );
  return rows[0] || null;
};

export const deleteUser = async (userId) => {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [userId]
  );
  return rows[0] || null;
};

export const resetUserPassword = async (userId, hashedPassword) => {
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $2, updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [userId, hashedPassword]
  );
  return rows[0] || null;
};