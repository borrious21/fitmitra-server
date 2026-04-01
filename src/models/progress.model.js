// src/models/progress.model.js
import pool from "../config/db.config.js";

class ProgressModel {
  static async logProgress(userId, data) {
    const {
      log_date = new Date().toISOString().split("T")[0],
      weight_kg,
      body_fat_percentage,
      measurements = {},
      progress_photos = [],
      energy_level,
      sleep_hours,
      water_intake_liters,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      blood_pressure,
      heart_rate,
      notes = "",
    } = data;

    
    const bp_systolic  = blood_pressure_systolic  ?? null;
    const bp_diastolic = blood_pressure_diastolic ?? null;
    const bp_string    = bp_systolic && bp_diastolic
      ? `${bp_systolic}/${bp_diastolic}`
      : (blood_pressure ?? null);

    const { rows } = await pool.query(
      `INSERT INTO progress_logs (
        user_id, log_date,
        weight_kg, body_fat_percentage,
        measurements, progress_photos,
        energy_level, sleep_hours, water_intake_liters,
        blood_pressure_systolic, blood_pressure_diastolic, blood_pressure,
        heart_rate,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id, log_date)
      DO UPDATE SET
        weight_kg              = COALESCE($3,  progress_logs.weight_kg),
        body_fat_percentage    = COALESCE($4,  progress_logs.body_fat_percentage),
        measurements           = COALESCE($5,  progress_logs.measurements),
        progress_photos        = COALESCE($6,  progress_logs.progress_photos),
        energy_level           = COALESCE($7,  progress_logs.energy_level),
        sleep_hours            = COALESCE($8,  progress_logs.sleep_hours),
        water_intake_liters    = COALESCE($9,  progress_logs.water_intake_liters),
        blood_pressure_systolic  = COALESCE($10, progress_logs.blood_pressure_systolic),
        blood_pressure_diastolic = COALESCE($11, progress_logs.blood_pressure_diastolic),
        blood_pressure         = COALESCE($12, progress_logs.blood_pressure),
        heart_rate             = COALESCE($13, progress_logs.heart_rate),
        notes                  = COALESCE($14, progress_logs.notes),
        updated_at             = NOW()
      RETURNING *`,
      [
        userId,
        log_date,
        weight_kg          ?? null,
        body_fat_percentage ?? null,
        JSON.stringify(measurements),
        progress_photos,
        energy_level       ?? null,
        sleep_hours        ?? null,
        water_intake_liters ?? null,
        bp_systolic,
        bp_diastolic,
        bp_string,
        heart_rate         ?? null,
        notes,
      ]
    );

    return rows[0];
  }

  static async getProgressHistory(userId, filters = {}) {
    const {
      start_date,
      end_date,
      limit  = 50,
      offset = 0,
    } = filters;

    let query  = `SELECT * FROM progress_logs WHERE user_id = $1`;
    const params = [userId];
    let paramCount = 1;

    if (start_date) {
      params.push(start_date);
      query += ` AND log_date >= $${++paramCount}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND log_date <= $${++paramCount}`;
    }

    query += ` ORDER BY log_date DESC`;
    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getProgressTrends(userId, days = 30) {
    const { rows } = await pool.query(
      `SELECT
        log_date,
        weight_kg,
        body_fat_percentage,
        energy_level,
        sleep_hours,
        water_intake_liters,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        blood_pressure,
        heart_rate
      FROM progress_logs
      WHERE user_id = $1
      AND log_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY log_date ASC`,
      [userId]
    );

    if (rows.length < 2) return { data: rows, trends: null };

    const first = rows[0];
    const last  = rows[rows.length - 1];

    // Helper: average of non-null values
    const avg = (field) => {
      const vals = rows.map(r => r[field]).filter(v => v !== null && v !== undefined);
      return vals.length ? vals.reduce((s, v) => s + Number(v), 0) / vals.length : null;
    };

    return {
      data: rows,
      trends: {
        weight_change:    last.weight_kg           && first.weight_kg           ? Number(last.weight_kg)           - Number(first.weight_kg)           : null,
        body_fat_change:  last.body_fat_percentage && first.body_fat_percentage ? Number(last.body_fat_percentage) - Number(first.body_fat_percentage) : null,
        avg_energy:       avg("energy_level"),
        avg_sleep:        avg("sleep_hours"),
        avg_water:        avg("water_intake_liters"),
        avg_heart_rate:   avg("heart_rate"),
        avg_systolic:     avg("blood_pressure_systolic"),
        avg_diastolic:    avg("blood_pressure_diastolic"),
        period_days:      days,
        entries_count:    rows.length,
      },
    };
  }

  static async getLatestProgress(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM progress_logs
      WHERE user_id = $1
      ORDER BY log_date DESC
      LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  static async deleteProgress(userId, progressId) {
    const { rowCount } = await pool.query(
      `DELETE FROM progress_logs WHERE id = $1 AND user_id = $2`,
      [progressId, userId]
    );
    return rowCount > 0;
  }

  static async countProgressLogs() {
    const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM progress_logs`);
    return Number(rows[0].total);
  }

  static async avgWeight() {
    const { rows } = await pool.query(`SELECT AVG(weight_kg) AS avg_weight FROM progress_logs`);
    return Number(rows[0].avg_weight);
  }

  static async avgBodyFat() {
    const { rows } = await pool.query(`SELECT AVG(body_fat_percentage) AS avg_body_fat FROM progress_logs`);
    return Number(rows[0].avg_body_fat);
  }
}

export default ProgressModel;