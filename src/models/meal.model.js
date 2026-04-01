// src/models/meal.model.js

import pool from "../config/db.config.js";

export class MealModel {
  static async findById(id) {
    try {
      if (!id || isNaN(id)) throw new Error("Valid meal ID is required");

      const { rows } = await pool.query(
        `SELECT id, name, calories, macros, cuisine, diet_type, tags
         FROM meals WHERE id = $1`,
        [id]
      );

      return rows[0] || null;
    } catch (error) {
      console.error(`Error finding meal by id ${id}:`, error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      const { dietType, cuisine, tag, limit = 50, offset = 0 } = filters;

      const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const safeOffset = Math.max(parseInt(offset) || 0, 0);

      const where = [];
      const values = [];
      let i = 1;

      if (dietType) { where.push(`diet_type = $${i++}`); values.push(dietType); }
      if (cuisine)  { where.push(`cuisine = $${i++}`);   values.push(cuisine); }
      if (tag)      { where.push(`tags ? $${i++}`);       values.push(tag); }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as total FROM meals ${whereClause}`,
        values
      );

      values.push(safeLimit, safeOffset);

      const { rows } = await pool.query(
        `SELECT id, name, calories, macros, cuisine, diet_type, tags
         FROM meals
         ${whereClause}
         ORDER BY id DESC
         LIMIT $${i++} OFFSET $${i++}`,
        values
      );

      return {
        meals: rows,
        total: parseInt(countRows[0].total),
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      console.error("Error finding meals:", error);
      throw error;
    }
  }

  static async create(payload) {
    try {
      const { name, calories, macros, cuisine = null, dietType = null, tags = null } = payload;

      if (!name || !name.trim()) throw new Error("Meal name is required");
      if (calories == null || isNaN(calories) || calories < 0) throw new Error("Valid calories value is required (must be non-negative)");
      if (!macros || typeof macros !== "object") throw new Error("macros must be an object");

      const { protein, carbs, fats } = macros;
      if (protein == null || carbs == null || fats == null) throw new Error("macros must include protein, carbs, and fats");
      if (protein < 0 || carbs < 0 || fats < 0) throw new Error("macro values must be non-negative");
      if (tags !== null && !Array.isArray(tags)) throw new Error("tags must be an array");

      const { rows } = await pool.query(
        `INSERT INTO meals (name, calories, macros, cuisine, diet_type, tags)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb)
         RETURNING id, name, calories, macros, cuisine, diet_type, tags`,
        [name.trim(), calories, JSON.stringify(macros), cuisine, dietType, tags ? JSON.stringify(tags) : null]
      );

      return rows[0];
    } catch (error) {
      console.error("Error creating meal:", error);
      throw error;
    }
  }

  static async updateById(id, payload) {
    try {
      if (!id || isNaN(id)) throw new Error("Valid meal ID is required");

      const set = [];
      const values = [];
      let i = 1;

      if (payload.name !== undefined) {
        if (!payload.name.trim()) throw new Error("Meal name cannot be empty");
        set.push(`name = $${i++}`);
        values.push(payload.name.trim());
      }

      if (payload.calories !== undefined) {
        if (isNaN(payload.calories) || payload.calories < 0) throw new Error("calories must be a non-negative number");
        set.push(`calories = $${i++}`);
        values.push(payload.calories);
      }

      if (payload.macros !== undefined) {
        if (!payload.macros || typeof payload.macros !== "object") throw new Error("macros must be an object");
        const { protein, carbs, fats } = payload.macros;
        if (protein != null && (isNaN(protein) || protein < 0)) throw new Error("protein must be a non-negative number");
        if (carbs != null && (isNaN(carbs) || carbs < 0)) throw new Error("carbs must be a non-negative number");
        if (fats != null && (isNaN(fats) || fats < 0)) throw new Error("fats must be a non-negative number");
        set.push(`macros = $${i++}::jsonb`);
        values.push(JSON.stringify(payload.macros));
      }

      if (payload.cuisine !== undefined) { set.push(`cuisine = $${i++}`); values.push(payload.cuisine); }
      if (payload.dietType !== undefined) { set.push(`diet_type = $${i++}`); values.push(payload.dietType); }

      if (payload.tags !== undefined) {
        if (payload.tags !== null && !Array.isArray(payload.tags)) throw new Error("tags must be an array");
        set.push(`tags = $${i++}::jsonb`);
        values.push(payload.tags ? JSON.stringify(payload.tags) : null);
      }

      if (set.length === 0) return this.findById(id);

      values.push(id);

      const { rows } = await pool.query(
        `UPDATE meals
         SET ${set.join(", ")}, updated_at = NOW()
         WHERE id = $${i}
         RETURNING id, name, calories, macros, cuisine, diet_type, tags`,
        values
      );

      return rows[0] || null;
    } catch (error) {
      console.error(`Error updating meal ${id}:`, error);
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      if (!id || isNaN(id)) throw new Error("Valid meal ID is required");

      const { rows } = await pool.query(
        `DELETE FROM meals WHERE id = $1 RETURNING id`,
        [id]
      );

      return rows[0] || null;
    } catch (error) {
      console.error(`Error deleting meal ${id}:`, error);
      throw error;
    }
  }

  static async exists(id) {
    try {
      if (!id || isNaN(id)) return false;

      const { rows } = await pool.query(
        "SELECT EXISTS(SELECT 1 FROM meals WHERE id = $1) as exists",
        [id]
      );

      return rows[0].exists;
    } catch (error) {
      console.error(`Error checking meal existence ${id}:`, error);
      throw error;
    }
  }

  static async findByIds(ids = []) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return [];

      const validIds = ids.filter((id) => !isNaN(id) && id > 0);
      if (validIds.length === 0) return [];

      const { rows } = await pool.query(
        `SELECT id, name, calories, macros, cuisine, diet_type, tags
         FROM meals WHERE id = ANY($1::int[])`,
        [validIds]
      );

      return rows;
    } catch (error) {
      console.error("Error finding meals by IDs:", error);
      throw error;
    }
  }
}

export class MealLogModel {
  static async create(data) {
    try {
      const {
        userId, planId = null, week = null, mealId = null,
        mealType, source, mealName, calories,
        protein = 0, carbs = 0, fats = 0, notes = null,
      } = data;

      if (!userId || isNaN(userId)) throw new Error("Valid user ID is required");
      if (!mealType || !mealType.trim()) throw new Error("Meal type is required");
      if (!source || !source.trim()) throw new Error("Source is required");
      if (!mealName || !mealName.trim()) throw new Error("Meal name is required");
      if (calories == null || isNaN(calories) || calories < 0) throw new Error("Calories must be a non-negative number");
      if (week !== null && (!Number.isInteger(week) || week < 1)) throw new Error("Week must be a positive integer");

      const proteinG = Number(protein);
      const carbsG = Number(carbs);
      const fatsG = Number(fats);

      if (proteinG < 0 || carbsG < 0 || fatsG < 0) throw new Error("Nutrition values must be non-negative");

      const { rows } = await pool.query(
        `INSERT INTO meal_logs (
          user_id, plan_id, week, meal_id, meal_type, source,
          meal_name, calories_consumed, protein_g, carbs_g, fats_g,
          consumed_at, log_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), CURRENT_DATE, $12)
        RETURNING *`,
        [
          userId, planId, week, mealId,
          mealType.trim(), source.trim(), mealName.trim(),
          Number(calories), proteinG, carbsG, fatsG,
          notes ? notes.trim() : null,
        ]
      );

      return rows[0];
    } catch (error) {
      console.error("Error creating meal log:", error);
      throw error;
    }
  }

  static async findByUser(userId, filters = {}) {
    try {
      if (!userId || isNaN(userId)) throw new Error("Valid user ID is required");

      const { startDate, endDate, mealType, limit = 50, offset = 0 } = filters;

      const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
      const safeOffset = Math.max(Number(offset), 0);

      const where = ["user_id = $1"];
      const values = [userId];
      let i = 2;

      if (startDate) { where.push(`log_date >= $${i++}`); values.push(startDate); }
      if (endDate)   { where.push(`log_date <= $${i++}`); values.push(endDate); }
      if (mealType)  { where.push(`meal_type = $${i++}`); values.push(mealType); }

      const whereClause = where.join(" AND ");

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM meal_logs WHERE ${whereClause}`,
        values
      );

      values.push(safeLimit, safeOffset);

      const { rows } = await pool.query(
        `SELECT * FROM meal_logs
         WHERE ${whereClause}
         ORDER BY consumed_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        values
      );

      return {
        logs: rows,
        total: Number(countRows[0].count),
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      console.error("Error fetching meal logs:", error);
      throw error;
    }
  }

  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM meal_logs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return rows[0] || null;
  }

  static async findByDate(userId, date) {
    const { rows } = await pool.query(
      `SELECT * FROM meal_logs
       WHERE user_id = $1 AND log_date = $2
       ORDER BY consumed_at ASC`,
      [userId, date]
    );

    return rows;
  }

  static async getDailySummary(userId, date) {
    const { rows } = await pool.query(
      `SELECT
        log_date,
        COUNT(*) AS meal_count,
        SUM(calories_consumed) AS total_calories,
        SUM(protein_g) AS total_protein,
        SUM(carbs_g) AS total_carbs,
        SUM(fats_g) AS total_fats
       FROM meal_logs
       WHERE user_id = $1 AND log_date = $2
       GROUP BY log_date`,
      [userId, date]
    );

    return rows[0] || {
      log_date: date,
      meal_count: 0,
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
    };
  }

  static async getRangeSummary(userId, startDate, endDate) {
    const { rows } = await pool.query(
      `SELECT
        log_date,
        COUNT(*) AS meal_count,
        SUM(calories_consumed) AS total_calories,
        SUM(protein_g) AS total_protein,
        SUM(carbs_g) AS total_carbs,
        SUM(fats_g) AS total_fats
       FROM meal_logs
       WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
       GROUP BY log_date
       ORDER BY log_date DESC`,
      [userId, startDate, endDate]
    );

    return rows;
  }

  static async getDailyTotals(userId, logDate) {
    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(calories_consumed), 0)::int     AS calories,
        COALESCE(SUM(protein_g), 0)::float8          AS protein_g,
        COALESCE(SUM(carbs_g), 0)::float8            AS carbs_g,
        COALESCE(SUM(fats_g), 0)::float8             AS fats_g,
        MAX(week)::int                               AS week
       FROM meal_logs
       WHERE user_id = $1 AND log_date = $2`,
      [userId, logDate]
    );

    return rows[0];
  }

  static async getDailyByMealType(userId, logDate) {
    const { rows } = await pool.query(
      `SELECT
        meal_type,
        COALESCE(SUM(calories_consumed), 0)::int  AS calories,
        COALESCE(SUM(protein_g), 0)::float8       AS protein_g,
        COALESCE(SUM(carbs_g), 0)::float8         AS carbs_g,
        COALESCE(SUM(fats_g), 0)::float8          AS fats_g
       FROM meal_logs
       WHERE user_id = $1 AND log_date = $2
       GROUP BY meal_type
       ORDER BY meal_type`,
      [userId, logDate]
    );

    const base = {
      breakfast: { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
      lunch:     { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
      dinner:    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
      snack:     { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    };

    for (const row of rows) {
      if (base[row.meal_type]) {
        base[row.meal_type] = {
          calories: row.calories,
          protein_g: row.protein_g,
          carbs_g: row.carbs_g,
          fats_g: row.fats_g,
        };
      }
    }

    return base;
  }

  static async getWeeklyTotals(userId, planId, week) {
    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(calories_consumed), 0)::int  AS calories,
        COALESCE(SUM(protein_g), 0)::float8       AS protein_g,
        COALESCE(SUM(carbs_g), 0)::float8         AS carbs_g,
        COALESCE(SUM(fats_g), 0)::float8          AS fats_g
       FROM meal_logs
       WHERE user_id = $1 AND plan_id = $2 AND week = $3`,
      [userId, planId, week]
    );

    return rows[0];
  }

  static async getWeeklyPerDay(userId, planId, week) {
    const { rows } = await pool.query(
      `SELECT
        log_date,
        COALESCE(SUM(calories_consumed), 0)::int  AS calories,
        COALESCE(SUM(protein_g), 0)::float8       AS protein_g,
        COALESCE(SUM(carbs_g), 0)::float8         AS carbs_g,
        COALESCE(SUM(fats_g), 0)::float8          AS fats_g
       FROM meal_logs
       WHERE user_id = $1 AND plan_id = $2 AND week = $3
       GROUP BY log_date
       ORDER BY log_date`,
      [userId, planId, week]
    );

    return rows;
  }

  static async updateById(id, userId, data) {
    const set = [];
    const values = [];
    let i = 1;

    if (data.mealName !== undefined) { set.push(`meal_name = $${i++}`);         values.push(data.mealName.trim()); }
    if (data.calories !== undefined) { set.push(`calories_consumed = $${i++}`); values.push(Number(data.calories)); }
    if (data.protein !== undefined)  { set.push(`protein_g = $${i++}`);         values.push(Number(data.protein)); }
    if (data.carbs !== undefined)    { set.push(`carbs_g = $${i++}`);           values.push(Number(data.carbs)); }
    if (data.fats !== undefined)     { set.push(`fats_g = $${i++}`);            values.push(Number(data.fats)); }
    if (data.notes !== undefined)    { set.push(`notes = $${i++}`);             values.push(data.notes ? data.notes.trim() : null); }

    if (!set.length) return this.findById(id, userId);

    values.push(id, userId);

    const { rows } = await pool.query(
      `UPDATE meal_logs
       SET ${set.join(", ")}
       WHERE id = $${i++} AND user_id = $${i++}
       RETURNING *`,
      values
    );

    return rows[0] || null;
  }

  static async deleteById(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM meal_logs WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    return rows[0] || null;
  }

  static async exists(id, userId) {
    const { rows } = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM meal_logs WHERE id = $1 AND user_id = $2) AS exists`,
      [id, userId]
    );

    return rows[0].exists;
  }

  static async deleteByDate(userId, date) {
    const { rows } = await pool.query(
      `DELETE FROM meal_logs WHERE user_id = $1 AND log_date = $2 RETURNING id`,
      [userId, date]
    );

    return rows;
  }
}

export default MealModel;