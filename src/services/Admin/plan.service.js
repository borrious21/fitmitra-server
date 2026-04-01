// src/services/Admin/plan.service.js
import pool from "../../config/db.config.js";

export const getAllPlans = async ({ limit = 50, offset = 0, is_active = null }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (is_active !== null) {
    params.push(is_active);
    where += ` AND p.is_active = $${params.length}`;
  }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT
       p.id, p.user_id, p.is_active, p.duration_weeks, p.goals,
       p.mesocycle_week, p.started_at, p.generated_at, p.completed_at,
       u.name AS user_name, u.email AS user_email,
       pr.goal AS profile_goal, pr.activity_level
     FROM plans p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN profiles pr ON pr.user_id = p.user_id
     ${where}
     ORDER BY p.generated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM plans p ${where}`,
    params.slice(0, params.length - 2)
  );

  return { plans: rows, total: Number(countRows[0].count) };
};

export const getPlanById = async (id) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS user_name, u.email AS user_email
     FROM plans p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const deactivatePlan = async (id) => {
  const { rows } = await pool.query(
    `UPDATE plans SET is_active = false, updated_at = NOW()
     WHERE id = $1 RETURNING id, user_id, is_active`,
    [id]
  );
  return rows[0] || null;
};

export const deletePlan = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM plans WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
};