// src/models/plan.model.js

import pool from "../config/db.config.js";

class PlanModel {

  static async create({ user_id, plan_data, profile_snapshot }) {
    const query = `
      INSERT INTO plans (
        user_id,
        workout_plan,
        meal_plan,
        habits,
        goals,
        duration_weeks,
        metadata,
        is_active
      )
      VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, true)
      RETURNING *;
    `;

    const values = [
      user_id,
      JSON.stringify(plan_data.workout),
      JSON.stringify(plan_data.meals),
      JSON.stringify(plan_data.habits ?? []),
      profile_snapshot.goals,
      profile_snapshot.duration,
      JSON.stringify(profile_snapshot),
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async getPlanById(id) {
    const { rows } = await pool.query(`SELECT * FROM plans WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  static async countPlans() {
    const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM plans`);
    return Number(rows[0].total);
  }

  static async getActivePlanByUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM plans WHERE user_id = $1 AND is_active = true ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );
    return rows[0] ?? null;
  }

  static async getPlansByUser(userId, { limit = 10, offset = 0 }) {
    const { rows } = await pool.query(
      `SELECT * FROM plans WHERE user_id = $1 ORDER BY generated_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }

 
  static async deactivateAllPlans(userId) {
    await pool.query(
      `UPDATE plans SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }

  static async deactivateOtherPlans(userId, activePlanId) {
    await pool.query(
      `UPDATE plans SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND id <> $2`,
      [userId, activePlanId]
    );
  }

  static async activatePlan(planId, userId) {
    await pool.query(
      `UPDATE plans SET is_active = false WHERE user_id = $1`,
      [userId]
    );
    const { rows } = await pool.query(
      `UPDATE plans SET is_active = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [planId, userId]
    );
    return rows[0] ?? null;
  }

  static async completePlan(planId, userId) {
    const { rows } = await pool.query(
      `UPDATE plans SET is_active = false, completed_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [planId, userId]
    );
    return rows[0] ?? null;
  }

  static async deletePlan(planId, userId) {
    await pool.query(`DELETE FROM plans WHERE id = $1 AND user_id = $2`, [planId, userId]);
  }

  static async getUserPlanStats(userId) {
    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*)                                         AS total_plans,
        COUNT(*) FILTER (WHERE is_active = true)         AS active_plans,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed_plans
      FROM plans
      WHERE user_id = $1
      `,
      [userId]
    );
    return rows[0];
  }
}

export default PlanModel;