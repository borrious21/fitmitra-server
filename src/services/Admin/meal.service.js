// admin/services/meal.service.js
import pool from "../../config/db.config.js";

export const getAllMeals = async ({ limit = 50, offset = 0, search = "", diet_type = "", tag = "" }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }
  if (diet_type) {
    params.push(diet_type);
    where += ` AND diet_type = $${params.length}`;
  }
  if (tag) {
    params.push(tag);
    where += ` AND tags ? $${params.length}`;
  }

  const countParams = [...params];
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT * FROM meals ${where}
     ORDER BY name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM meals ${where}`,
    countParams
  );

  return { meals: rows, total: Number(countRows[0].count) };
};

export const getMealById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM meals WHERE id = $1`, [id]);
  return rows[0] || null;
};

export const createMeal = async (data) => {
  const { name, calories, macros = {}, cuisine = null, diet_type = "veg", tags = null } = data;
  const { rows } = await pool.query(
    `INSERT INTO meals (name, calories, macros, cuisine, diet_type, tags)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, calories, JSON.stringify(macros), cuisine, diet_type, tags ? JSON.stringify(tags) : null]
  );
  return rows[0];
};

export const updateMeal = async (id, data) => {
  const fields = [];
  const params = [];

  if (data.name      !== undefined) { params.push(data.name);                   fields.push(`name = $${params.length}`); }
  if (data.calories  !== undefined) { params.push(data.calories);               fields.push(`calories = $${params.length}`); }
  if (data.macros    !== undefined) { params.push(JSON.stringify(data.macros)); fields.push(`macros = $${params.length}`); }
  if (data.cuisine   !== undefined) { params.push(data.cuisine);                fields.push(`cuisine = $${params.length}`); }
  if (data.diet_type !== undefined) { params.push(data.diet_type);              fields.push(`diet_type = $${params.length}`); }
  if (data.tags      !== undefined) { params.push(JSON.stringify(data.tags));   fields.push(`tags = $${params.length}`); }

  if (!fields.length) return getMealById(id);

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE meals SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
};

export const deleteMeal = async (id) => {
  const { rows } = await pool.query(`DELETE FROM meals WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
};