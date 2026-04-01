// admin/services/analytic.service.js
import pool from "../../config/db.config.js";

export const getPlatformOverview = async () => {
  const [users, workouts, meals, plans, activeToday, banned, verified] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM users`),
    pool.query(`SELECT COUNT(*) AS total FROM workout_logs`),
    pool.query(`SELECT COUNT(*) AS total FROM meal_logs`),
    pool.query(`SELECT COUNT(*) AS total FROM plans WHERE is_active = true`),
    pool.query(`SELECT COUNT(DISTINCT user_id) AS total FROM workout_logs WHERE workout_date = CURRENT_DATE`),
    pool.query(`SELECT COUNT(*) AS total FROM users WHERE is_active = false`),
    pool.query(`SELECT COUNT(*) AS total FROM users WHERE is_verified = true`),
  ]);

  const [newToday, newThisWeek] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM users WHERE created_at >= CURRENT_DATE`),
    pool.query(`SELECT COUNT(*) AS total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
  ]);

  return {
    total_users:         Number(users.rows[0].total),
    total_workouts:      Number(workouts.rows[0].total),
    total_meal_logs:     Number(meals.rows[0].total),
    active_plans:        Number(plans.rows[0].total),
    active_today:        Number(activeToday.rows[0].total),
    banned_users:        Number(banned.rows[0].total),
    verified_users:      Number(verified.rows[0].total),
    new_users_today:     Number(newToday.rows[0].total),
    new_users_this_week: Number(newThisWeek.rows[0].total),
  };
};

export const getUserStats = async () => {
  const { rows } = await pool.query(
    `SELECT goal, activity_level, diet_type, COUNT(*) AS user_count,
            AVG(age)::numeric(5,1) AS avg_age,
            AVG(weight_kg)::numeric(5,1) AS avg_weight_kg
     FROM profiles
     GROUP BY goal, activity_level, diet_type
     ORDER BY user_count DESC`
  );
  return rows;
};

export const getWorkoutStats = async () => {
  const { rows } = await pool.query(
    `SELECT DATE_TRUNC('day', workout_date::timestamp) AS day,
            COUNT(*) AS total_workouts,
            COUNT(DISTINCT user_id) AS unique_users
     FROM workout_logs
     WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY day ORDER BY day ASC`
  );
  return rows;
};

export const getMealStats = async () => {
  const { rows } = await pool.query(
    `SELECT meal_type, COUNT(*) AS total_logs,
            AVG(calories_consumed)::numeric(7,1) AS avg_calories,
            AVG(protein_g)::numeric(6,1) AS avg_protein
     FROM meal_logs
     WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY meal_type ORDER BY total_logs DESC`
  );
  return rows;
};

export const getRetentionStats = async () => {
  const { rows } = await pool.query(
    `SELECT DATE_TRUNC('week', created_at) AS cohort_week,
            COUNT(*) AS new_users,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS retained_last_7d
     FROM users
     WHERE created_at >= NOW() - INTERVAL '90 days'
     GROUP BY cohort_week ORDER BY cohort_week DESC`
  );
  return rows;
};

export const getAtRiskUsers = async () => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, p.age, p.weight_kg, p.height_cm, p.medical_conditions,
            CASE WHEN p.height_cm > 0
              THEN ROUND((p.weight_kg / ((p.height_cm / 100.0) ^ 2))::numeric, 1)
              ELSE NULL
            END AS approx_bmi,
            'Medical condition or BMI concern' AS reason
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE
       (p.medical_conditions->>'high_blood_pressure' = 'true')
       OR (p.medical_conditions->>'diabetes' = 'true')
       OR (p.medical_conditions->>'heart_disease' = 'true')
       OR (p.height_cm > 0 AND (
         (p.weight_kg / ((p.height_cm / 100.0) ^ 2)) > 30
         OR (p.weight_kg / ((p.height_cm / 100.0) ^ 2)) < 18.5
       ))
     ORDER BY p.weight_kg DESC LIMIT 20`
  );
  return rows;
};

export const getTopActiveUsers = async (limit = 10) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email,
            COUNT(wl.id)::int            AS total_workouts,
            us.current_workout_streak    AS current_streak,
            up.avatar_url
     FROM users u
     JOIN workout_logs wl ON wl.user_id = u.id
     LEFT JOIN user_streaks us     ON us.user_id = u.id
     LEFT JOIN user_preferences up ON up.user_id = u.id
     WHERE wl.workout_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY u.id, u.name, u.email, us.current_workout_streak, up.avatar_url
     ORDER BY total_workouts DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

export const getPopularWorkouts = async (limit = 8) => {
  const { rows } = await pool.query(
    `SELECT exercise_name,
            COUNT(*)::int                  AS times_logged,
            COUNT(DISTINCT user_id)::int   AS unique_users,
            AVG(perceived_exertion)::numeric(3,1) AS avg_difficulty
     FROM workout_logs
     WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY exercise_name
     ORDER BY times_logged DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

export const getUserGrowth = async () => {
  const { rows } = await pool.query(
    `SELECT
       TO_CHAR(day, 'Mon DD') AS label,
       day::text,
       COALESCE(signups, 0)::int AS signups
     FROM generate_series(
       CURRENT_DATE - INTERVAL '13 days',
       CURRENT_DATE,
       '1 day'::interval
     ) AS day
     LEFT JOIN (
       SELECT DATE_TRUNC('day', created_at)::date AS signup_date, COUNT(*)::int AS signups
       FROM users
       WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
       GROUP BY signup_date
     ) s ON s.signup_date = day::date
     ORDER BY day ASC`
  );
  return rows;
};

export const getGoalDistribution = async () => {
  const { rows } = await pool.query(
    `SELECT COALESCE(goal, 'not_set') AS goal, COUNT(*)::int AS count
     FROM profiles GROUP BY goal ORDER BY count DESC`
  );
  return rows;
};