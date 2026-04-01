// admin/services/exercise.service.js
import pool from "../../config/db.config.js";

export const getAllExercises = async ({ limit = 50, offset = 0, search = "", muscle_group = "", equipment = "" }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }
  if (muscle_group) {
    params.push(muscle_group);
    where += ` AND muscle_group = $${params.length}`;
  }
  if (equipment) {
    params.push(equipment);
    where += ` AND equipment = $${params.length}`;
  }

  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT * FROM exercises ${where}
     ORDER BY name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM exercises ${where}`,
    params.slice(0, params.length - 2)
  );

  return { exercises: rows, total: Number(countRows[0].count) };
};

export const getExerciseById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM exercises WHERE id = $1`, [id]);
  return rows[0] || null;
};

// exercises table: id, name, muscle_group, difficulty (VARCHAR), equipment, contraindications (JSONB)
export const createExercise = async (data) => {
  const {
    name,
    muscle_group      = null,
    equipment         = null,
    difficulty        = "beginner",   // VARCHAR: beginner | intermediate | advanced
    contraindications = null,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO exercises (name, muscle_group, equipment, difficulty, contraindications, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [
      name,
      muscle_group,
      equipment,
      difficulty,
      contraindications ? JSON.stringify(contraindications) : null,
    ]
  );
  return rows[0];
};

export const updateExercise = async (id, data) => {
  const fields  = [];
  const params  = [];

  // Only columns that actually exist in the exercises table
  if (data.name         !== undefined) { params.push(data.name);         fields.push(`name = $${params.length}`); }
  if (data.muscle_group !== undefined) { params.push(data.muscle_group); fields.push(`muscle_group = $${params.length}`); }
  if (data.equipment    !== undefined) { params.push(data.equipment);    fields.push(`equipment = $${params.length}`); }
  if (data.difficulty   !== undefined) { params.push(data.difficulty);   fields.push(`difficulty = $${params.length}`); }
  if (data.contraindications !== undefined) {
    params.push(JSON.stringify(data.contraindications));
    fields.push(`contraindications = $${params.length}`);
  }

  if (!fields.length) return getExerciseById(id);

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE exercises SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
};

export const deleteExercise = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM exercises WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
};