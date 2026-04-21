import pool from "../config/db.config.js";
import { validateProfile } from "../validators/profile.validator.js";
import { withMetrics } from "../metrics/profile.metrics.js";


class ProfileModel {
  static async findByUserId(userId) {
    // Surface the most recent weight from EITHER weight_logs OR progress_logs
    // so both the Progress page and the Profile/Dashboard always agree.
    // Falls back to profiles.weight_kg when neither table has an entry yet.
    const { rows } = await pool.query(
      `SELECT
         p.*,
         COALESCE(
           (
             SELECT weight_kg
             FROM (
               SELECT weight_kg, logged_date AS d
               FROM   weight_logs
               WHERE  user_id = $1 AND weight_kg IS NOT NULL
               UNION ALL
               SELECT weight_kg, log_date AS d
               FROM   progress_logs
               WHERE  user_id = $1 AND weight_kg IS NOT NULL
             ) combined
             ORDER  BY d DESC
             LIMIT  1
           ),
           p.weight_kg
         ) AS weight_kg
       FROM profiles p
       WHERE p.user_id = $1
       LIMIT 1`,
      [userId]
    );
    return rows[0] ? withMetrics(rows[0]) : null;
  }

  static async exists(userId) {
    const { rows } = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id=$1)",
      [userId]
    );
    return rows[0].exists;
  }

  static async countProfiles() {
  const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM profiles`);
  return Number(rows[0].total);
}

  static async findAll(limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(withMetrics);
  }

  static async create(userId, data) {
    validateProfile(data, true);

    const {
      age,
      gender,
      height_cm,
      weight_kg,
      goal,
      activity_level,
      diet_type,
      medical_conditions = {},
    } = data;

    const { rows } = await pool.query(
      `
      INSERT INTO profiles (
        user_id, age, gender, height_cm, weight_kg,
        goal, activity_level, diet_type, medical_conditions
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        userId,
        age,
        gender.toLowerCase(),
        height_cm,
        weight_kg,
        goal,
        activity_level,
        diet_type.toLowerCase(),
        JSON.stringify(medical_conditions),
      ]
    );

    return withMetrics(rows[0]);
  }

  static async update(userId, data) {
    validateProfile(data, false);

    const fields = [
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "goal",
      "activity_level",
      "diet_type",
      "medical_conditions",
    ];

    const updates = [];
    const values = [userId];
    let i = 1;

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${++i}`);

        if (field === "medical_conditions") {
          values.push(JSON.stringify(data[field]));
        } else if (field === "gender" || field === "diet_type") {
          values.push(data[field].toLowerCase());
        } else {
          values.push(data[field]);
        }
      }
    }

    if (!updates.length) return null;

    updates.push("updated_at = CURRENT_TIMESTAMP");

    const { rows } = await pool.query(
      `
      UPDATE profiles
      SET ${updates.join(", ")}
      WHERE user_id = $1
      RETURNING *
      `,
      values
    );

    return rows[0] ? withMetrics(rows[0]) : null;
  }

  static async delete(userId) {
    const { rowCount } = await pool.query(
      "DELETE FROM profiles WHERE user_id=$1",
      [userId]
    );
    return rowCount > 0;
  }
}

export default ProfileModel;