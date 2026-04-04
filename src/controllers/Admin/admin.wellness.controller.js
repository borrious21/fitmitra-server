// controllers/Admin/admin.wellness.controller.js

const pool = require('../db');

const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wc.*, COUNT(we.id)::int AS exercise_count
       FROM wellness_categories wc
       LEFT JOIN wellness_exercises we ON we.category_id = wc.id
       GROUP BY wc.id
       ORDER BY wc.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('admin getAllCategories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const result = await pool.query(
      `INSERT INTO wellness_categories (name, description, icon, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description || null, icon || null, color || null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created',
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('admin createCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, is_active } = req.body;

    const result = await pool.query(
      `UPDATE wellness_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           color = COALESCE($4, color),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name || null, description || null, icon || null, color || null, is_active ?? null, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category updated', data: result.rows[0] });
  } catch (err) {
    console.error('admin updateCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const exerciseCheck = await pool.query(
      'SELECT COUNT(*) FROM wellness_exercises WHERE category_id = $1', [id]
    );

    if (parseInt(exerciseCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with linked exercises. Deactivate it instead.'
      });
    }

    const result = await pool.query(
      'DELETE FROM wellness_categories WHERE id = $1 RETURNING id', [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('admin deleteCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllExercises = async (req, res) => {
  try {
    const { category_id, difficulty, is_active, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT we.*, wc.name AS category_name, wc.icon AS category_icon,
             u.name AS created_by_name
      FROM wellness_exercises we
      LEFT JOIN wellness_categories wc ON wc.id = we.category_id
      LEFT JOIN users u ON u.id = we.created_by
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (category_id) { query += ` AND we.category_id = $${paramCount++}`; params.push(category_id); }
    if (difficulty)  { query += ` AND we.difficulty = $${paramCount++}`; params.push(difficulty); }
    if (is_active !== undefined) { query += ` AND we.is_active = $${paramCount++}`; params.push(is_active === 'true'); }
    if (search) {
      query += ` AND (we.title ILIKE $${paramCount} OR we.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY we.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const countQuery = `SELECT COUNT(*) FROM wellness_exercises WHERE 1=1${
      category_id ? ` AND category_id = ${category_id}` : ''
    }`;
    const countResult = await pool.query(countQuery);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('admin getAllExercises error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createExercise = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      category_id, title, description, instructions,
      technique_type, duration_seconds, difficulty,
      benefits, tags, xp_reward
    } = req.body;

    if (!title || !description || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'title, description, and instructions are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO wellness_exercises
         (category_id, title, description, instructions, technique_type,
          duration_seconds, difficulty, benefits, tags, xp_reward, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        category_id || null,
        title.trim(),
        description.trim(),
        instructions.trim(),
        technique_type || null,
        duration_seconds || 300,
        difficulty || 'beginner',
        benefits || [],
        tags || [],
        xp_reward || 25,
        adminId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Exercise created',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('admin createExercise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id, title, description, instructions,
      technique_type, duration_seconds, difficulty,
      benefits, tags, xp_reward, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE wellness_exercises SET
         category_id      = COALESCE($1, category_id),
         title            = COALESCE($2, title),
         description      = COALESCE($3, description),
         instructions     = COALESCE($4, instructions),
         technique_type   = COALESCE($5, technique_type),
         duration_seconds = COALESCE($6, duration_seconds),
         difficulty       = COALESCE($7, difficulty),
         benefits         = COALESCE($8, benefits),
         tags             = COALESCE($9, tags),
         xp_reward        = COALESCE($10, xp_reward),
         is_active        = COALESCE($11, is_active),
         updated_at       = NOW()
       WHERE id = $12 RETURNING *`,
      [
        category_id ?? null,
        title?.trim() || null,
        description?.trim() || null,
        instructions?.trim() || null,
        technique_type || null,
        duration_seconds || null,
        difficulty || null,
        benefits || null,
        tags || null,
        xp_reward || null,
        is_active ?? null,
        id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    res.json({ success: true, message: 'Exercise updated', data: result.rows[0] });
  } catch (err) {
    console.error('admin updateExercise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE wellness_exercises SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    res.json({ success: true, message: 'Exercise deactivated (soft delete)' });
  } catch (err) {
    console.error('admin deleteExercise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 30, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT ws.*, wc.name AS category_name, wc.icon AS category_icon
       FROM wellness_sessions ws
       LEFT JOIN wellness_exercises we ON we.id = ws.exercise_id
       LEFT JOIN wellness_categories wc ON wc.id = we.category_id
       WHERE ws.user_id = $1
       ORDER BY ws.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('admin getUserSessions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserMoodHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT * FROM mood_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY log_date DESC`,
      [userId, parseInt(days)]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('admin getUserMoodHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getWellnessAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const interval = `${parseInt(days)} days`;

    const [
      overallStats,
      topExercises,
      moodTrend,
      categoryBreakdown,
      dailyActivity,
      stressTriggers
    ] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(DISTINCT ws.user_id)::int AS active_users,
          COUNT(ws.id)::int               AS total_sessions,
          COUNT(CASE WHEN ws.completed THEN 1 END)::int AS completed_sessions,
          ROUND(AVG(ws.duration_seconds) / 60, 1) AS avg_duration_minutes,
          COUNT(DISTINCT ml.user_id)::int AS mood_loggers,
          ROUND(AVG(ml.mood_score), 1)    AS platform_avg_mood
        FROM wellness_sessions ws
        LEFT JOIN mood_logs ml 
          ON ml.user_id = ws.user_id 
          AND ml.log_date >= CURRENT_DATE - INTERVAL '${interval}'
        WHERE ws.session_date >= CURRENT_DATE - INTERVAL '${interval}'
      `),

      pool.query(`
        SELECT we.title, we.technique_type, wc.name AS category,
               COUNT(ws.id)::int AS usage_count,
               ROUND(AVG(ws.duration_seconds) / 60, 1) AS avg_duration_minutes
        FROM wellness_sessions ws
        JOIN wellness_exercises we ON we.id = ws.exercise_id
        LEFT JOIN wellness_categories wc ON wc.id = we.category_id
        WHERE ws.session_date >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY we.id, we.title, we.technique_type, wc.name
        ORDER BY usage_count DESC LIMIT 5
      `),

      pool.query(`
        SELECT log_date, ROUND(AVG(mood_score), 1) AS avg_mood, COUNT(*)::int AS log_count
        FROM mood_logs
        WHERE log_date >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY log_date ORDER BY log_date
      `),

      pool.query(`
        SELECT wc.name AS category, wc.icon,
               COUNT(ws.id)::int AS session_count,
               ROUND(COUNT(ws.id)::numeric / NULLIF(SUM(COUNT(ws.id)) OVER (), 0) * 100, 1) AS percentage
        FROM wellness_sessions ws
        JOIN wellness_exercises we ON we.id = ws.exercise_id
        JOIN wellness_categories wc ON wc.id = we.category_id
        WHERE ws.session_date >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY wc.id, wc.name, wc.icon ORDER BY session_count DESC
      `),

      pool.query(`
        SELECT session_date AS date, COUNT(*)::int AS sessions,
               COUNT(DISTINCT user_id)::int AS unique_users
        FROM wellness_sessions
        WHERE session_date >= CURRENT_DATE - INTERVAL '${interval}'
        GROUP BY session_date ORDER BY session_date
      `),

      pool.query(`
        SELECT trigger_category,
               COUNT(*)::int AS count,
               ROUND(AVG(stress_level), 1) AS avg_stress
        FROM stress_logs
        WHERE log_date >= CURRENT_DATE - INTERVAL '${interval}'
          AND trigger_category IS NOT NULL
        GROUP BY trigger_category ORDER BY count DESC LIMIT 5
      `)
    ]);

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        overview: overallStats.rows[0],
        top_exercises: topExercises.rows,
        mood_trend: moodTrend.rows,
        category_breakdown: categoryBreakdown.rows,
        daily_activity: dailyActivity.rows,
        stress_triggers: stressTriggers.rows
      }
    });
  } catch (err) {
    console.error('admin getWellnessAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserWellnessEngagement = async (req, res) => {
  try {
    const { limit = 20, offset = 0, sort = 'sessions' } = req.query;

    const sortMap = {
      sessions: 'total_sessions DESC',
      mood: 'avg_mood DESC',
      streak: 'streak_days DESC'
    };
    const orderBy = sortMap[sort] || sortMap.sessions;

    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email,
        COUNT(DISTINCT ws.id)::int                 AS total_sessions,
        COUNT(DISTINCT ws.session_date)::int        AS active_days,
        ROUND(AVG(ws.duration_seconds) / 60, 1)    AS avg_duration_minutes,
        COUNT(DISTINCT ml.id)::int                 AS mood_logs,
        ROUND(AVG(ml.mood_score), 1)               AS avg_mood,
        COUNT(DISTINCT sl.id)::int                 AS stress_logs,
        ROUND(AVG(sl.stress_level), 1)             AS avg_stress,
        MAX(ws.session_date)                        AS last_session_date
      FROM users u
      LEFT JOIN wellness_sessions ws ON ws.user_id = u.id 
        AND ws.session_date >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN mood_logs ml ON ml.user_id = u.id 
        AND ml.log_date >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN stress_logs sl ON sl.user_id = u.id 
        AND sl.log_date >= CURRENT_DATE - INTERVAL '30 days'
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.email
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('admin getUserWellnessEngagement error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  getUserSessions,
  getUserMoodHistory,
  getWellnessAnalytics,
  getUserWellnessEngagement
};