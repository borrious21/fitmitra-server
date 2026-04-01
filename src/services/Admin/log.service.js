// admin/services/logsService.js
import pool from "../../config/db.config.js";

export const getWorkoutLogs = async ({ limit = 50, offset = 0, user_id = null, start_date = null, end_date = null }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (user_id) { params.push(user_id); where += ` AND wl.user_id = $${params.length}`; }
  if (start_date) { params.push(start_date); where += ` AND wl.workout_date >= $${params.length}`; }
  if (end_date)   { params.push(end_date);   where += ` AND wl.workout_date <= $${params.length}`; }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT wl.*, u.name AS user_name, u.email AS user_email
     FROM workout_logs wl
     JOIN users u ON u.id = wl.user_id
     ${where}
     ORDER BY wl.workout_date DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: c } = await pool.query(
    `SELECT COUNT(*) FROM workout_logs wl ${where}`,
    params.slice(0, -2)
  );
  return { logs: rows, total: Number(c[0].count) };
};

export const deleteWorkoutLog = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM workout_logs WHERE id = $1 RETURNING id`, [id]
  );
  return rows[0] || null;
};

export const getMealLogs = async ({ limit = 50, offset = 0, user_id = null, start_date = null, end_date = null }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (user_id) { params.push(user_id); where += ` AND ml.user_id = $${params.length}`; }
  if (start_date) { params.push(start_date); where += ` AND ml.log_date >= $${params.length}`; }
  if (end_date)   { params.push(end_date);   where += ` AND ml.log_date <= $${params.length}`; }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT ml.*, u.name AS user_name, u.email AS user_email
     FROM meal_logs ml
     JOIN users u ON u.id = ml.user_id
     ${where}
     ORDER BY ml.log_date DESC, ml.consumed_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: c } = await pool.query(
    `SELECT COUNT(*) FROM meal_logs ml ${where}`,
    params.slice(0, -2)
  );
  return { logs: rows, total: Number(c[0].count) };
};

export const deleteMealLog = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM meal_logs WHERE id = $1 RETURNING id`, [id]
  );
  return rows[0] || null;
};


export const getProgressLogs = async ({ limit = 50, offset = 0, user_id = null }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (user_id) { params.push(user_id); where += ` AND pl.user_id = $${params.length}`; }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT pl.*, u.name AS user_name
     FROM progress_logs pl
     JOIN users u ON u.id = pl.user_id
     ${where}
     ORDER BY pl.log_date DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: c } = await pool.query(
    `SELECT COUNT(*) FROM progress_logs pl ${where}`,
    params.slice(0, -2)
  );
  return { logs: rows, total: Number(c[0].count) };
};

export const getAdminLogs = async ({ limit = 50, offset = 0, admin_id = null }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (admin_id) { params.push(admin_id); where += ` AND al.admin_id = $${params.length}`; }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT al.*, u.name AS admin_name, u.email AS admin_email
     FROM admin_logs al
     JOIN users u ON u.id = al.admin_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: c } = await pool.query(
    `SELECT COUNT(*) FROM admin_logs al ${where}`,
    params.slice(0, -2)
  );
  return { logs: rows, total: Number(c[0].count) };
};