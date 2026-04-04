// controllers/User/wellness.controller.js

import pool from '../../config/db.config.js';

const getExercises = async (req, res) => {
  try {
    const { category_id, difficulty, search } = req.query;

    let query = `
      SELECT 
        we.id, we.title, we.description, we.instructions,
        we.technique_type, we.duration_seconds, we.difficulty,
        we.benefits, we.tags, we.xp_reward,
        wc.name AS category_name, wc.icon AS category_icon, wc.color AS category_color
      FROM wellness_exercises we
      LEFT JOIN wellness_categories wc ON wc.id = we.category_id
      WHERE we.is_active = TRUE
    `;
    const params = [];
    let paramCount = 1;

    if (category_id) {
      query += ` AND we.category_id = $${paramCount++}`;
      params.push(category_id);
    }
    if (difficulty) {
      query += ` AND we.difficulty = $${paramCount++}`;
      params.push(difficulty);
    }
    if (search) {
      query += ` AND (we.title ILIKE $${paramCount} OR we.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY wc.name, we.difficulty, we.title`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getExercises error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT we.*, wc.name AS category_name, wc.icon AS category_icon, wc.color AS category_color
       FROM wellness_exercises we
       LEFT JOIN wellness_categories wc ON wc.id = we.category_id
       WHERE we.id = $1 AND we.is_active = TRUE`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getExerciseById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wc.*, COUNT(we.id)::int AS exercise_count
       FROM wellness_categories wc
       LEFT JOIN wellness_exercises we ON we.category_id = wc.id AND we.is_active = TRUE
       WHERE wc.is_active = TRUE
       GROUP BY wc.id
       ORDER BY wc.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      exercise_id,
      duration_seconds,
      completed,
      mood_before,
      mood_after,
      notes,
      session_date
    } = req.body;

    let exerciseTitle = null;
    if (exercise_id) {
      const ex = await pool.query('SELECT title, xp_reward FROM wellness_exercises WHERE id = $1', [exercise_id]);
      if (ex.rows.length) exerciseTitle = ex.rows[0].title;
    }

    const result = await pool.query(
      `INSERT INTO wellness_sessions 
         (user_id, exercise_id, exercise_title, duration_seconds, completed, mood_before, mood_after, notes, session_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, exercise_id || null, exerciseTitle, duration_seconds, completed ?? true,
       mood_before || null, mood_after || null, notes || null,
       session_date || new Date().toISOString().split('T')[0]]
    );

    if (completed) {
      const xpQuery = await pool.query(
        'SELECT xp_reward FROM wellness_exercises WHERE id = $1', [exercise_id]
      );
      const xp = xpQuery.rows[0]?.xp_reward || 25;
      await pool.query(
        'UPDATE users SET xp = COALESCE(xp, 0) + $1 WHERE id = $2',
        [xp, userId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Session logged successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('logSession error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, from_date, to_date } = req.query;

    let query = `
      SELECT ws.*, wc.name AS category_name, wc.icon AS category_icon
      FROM wellness_sessions ws
      LEFT JOIN wellness_exercises we ON we.id = ws.exercise_id
      LEFT JOIN wellness_categories wc ON wc.id = we.category_id
      WHERE ws.user_id = $1
    `;
    const params = [userId];
    let paramCount = 2;

    if (from_date) { query += ` AND ws.session_date >= $${paramCount++}`; params.push(from_date); }
    if (to_date)   { query += ` AND ws.session_date <= $${paramCount++}`; params.push(to_date); }

    query += ` ORDER BY ws.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM wellness_sessions WHERE user_id = $1', [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM wellness_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    console.error('deleteSession error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logMood = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood_score, mood_label, energy_level, notes } = req.body;

    if (!mood_score || mood_score < 1 || mood_score > 10) {
      return res.status(400).json({ success: false, message: 'mood_score must be between 1 and 10' });
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO mood_logs (user_id, mood_score, mood_label, energy_level, notes, log_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, log_date) DO UPDATE
         SET mood_score = EXCLUDED.mood_score,
             mood_label = EXCLUDED.mood_label,
             energy_level = EXCLUDED.energy_level,
             notes = EXCLUDED.notes,
             logged_at = NOW()
       RETURNING *`,
      [userId, mood_score, mood_label || null, energy_level || null, notes || null, today]
    );

    res.status(201).json({
      success: true,
      message: 'Mood logged',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('logMood error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMoodHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT * FROM mood_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY log_date DESC`,
      [userId, parseInt(days)]
    );

    const avg = result.rows.length
      ? (result.rows.reduce((sum, r) => sum + r.mood_score, 0) / result.rows.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: result.rows,
      average_mood: parseFloat(avg),
      total_logs: result.rows.length
    });
  } catch (err) {
    console.error('getMoodHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMoodLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM mood_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Mood log not found' });
    }
    res.json({ success: true, message: 'Mood log deleted' });
  } catch (err) {
    console.error('deleteMoodLog error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logStress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stress_level, trigger_category, trigger_notes, coping_method } = req.body;

    if (!stress_level || stress_level < 1 || stress_level > 10) {
      return res.status(400).json({ success: false, message: 'stress_level must be between 1 and 10' });
    }

    const result = await pool.query(
      `INSERT INTO stress_logs (user_id, stress_level, trigger_category, trigger_notes, coping_method)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, stress_level, trigger_category || null, trigger_notes || null, coping_method || null]
    );

    res.status(201).json({
      success: true,
      message: 'Stress level logged',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('logStress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStressHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT * FROM stress_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY logged_at DESC`,
      [userId, parseInt(days)]
    );

    const avg = result.rows.length
      ? (result.rows.reduce((sum, r) => sum + r.stress_level, 0) / result.rows.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: result.rows,
      average_stress: parseFloat(avg),
      total_logs: result.rows.length
    });
  } catch (err) {
    console.error('getStressHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteStressLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM stress_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Stress log not found' });
    }
    res.json({ success: true, message: 'Stress log deleted' });
  } catch (err) {
    console.error('deleteStressLog error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addJournalEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entry } = req.body;

    if (!entry || !entry.trim()) {
      return res.status(400).json({ success: false, message: 'Journal entry cannot be empty' });
    }

    const result = await pool.query(
      `INSERT INTO gratitude_journal (user_id, entry) VALUES ($1, $2) RETURNING *`,
      [userId, entry.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Journal entry added',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('addJournalEntry error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getJournalEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM gratitude_journal WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM gratitude_journal WHERE user_id = $1', [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error('getJournalEntries error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateJournalEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { entry } = req.body;

    if (!entry || !entry.trim()) {
      return res.status(400).json({ success: false, message: 'Entry cannot be empty' });
    }

    const result = await pool.query(
      `UPDATE gratitude_journal SET entry = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [entry.trim(), id, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    res.json({ success: true, message: 'Entry updated', data: result.rows[0] });
  } catch (err) {
    console.error('updateJournalEntry error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteJournalEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM gratitude_journal WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    console.error('deleteJournalEntry error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getWellnessSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [sessionsToday, moodToday, stressToday, streakResult, weeklyStats] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count, SUM(duration_seconds) AS total_duration
         FROM wellness_sessions WHERE user_id = $1 AND session_date = $2 AND completed = TRUE`,
        [userId, today]
      ),
      pool.query(
        'SELECT * FROM mood_logs WHERE user_id = $1 AND log_date = $2',
        [userId, today]
      ),
      pool.query(
        `SELECT * FROM stress_logs WHERE user_id = $1 AND log_date = $2
         ORDER BY logged_at DESC LIMIT 1`,
        [userId, today]
      ),
      pool.query(
        `WITH daily AS (
           SELECT DISTINCT session_date FROM wellness_sessions
           WHERE user_id = $1 AND completed = TRUE
           ORDER BY session_date DESC
         ),
         streak AS (
           SELECT session_date,
                  ROW_NUMBER() OVER (ORDER BY session_date DESC) AS rn,
                  session_date - (ROW_NUMBER() OVER (ORDER BY session_date DESC) * INTERVAL '1 day')::date AS grp
           FROM daily
         )
         SELECT COUNT(*) AS streak_days FROM streak
         WHERE grp = (SELECT grp FROM streak LIMIT 1)`,
        [userId]
      ),
      pool.query(
        `SELECT 
           COUNT(DISTINCT session_date)::int AS active_days,
           COUNT(*)::int AS total_sessions,
           COALESCE(AVG(mood_score), 0)::numeric(4,1) AS avg_mood
         FROM wellness_sessions ws
         LEFT JOIN mood_logs ml ON ml.user_id = ws.user_id 
           AND ml.log_date = ws.session_date
         WHERE ws.user_id = $1 
           AND ws.session_date >= CURRENT_DATE - INTERVAL '7 days'`,
        [userId]
      )
    ]);

    res.json({
      success: true,
      data: {
        today: {
          sessions_completed: parseInt(sessionsToday.rows[0].count),
          total_duration_minutes: Math.round((sessionsToday.rows[0].total_duration || 0) / 60),
          mood: moodToday.rows[0] || null,
          stress: stressToday.rows[0] || null
        },
        streak_days: parseInt(streakResult.rows[0]?.streak_days || 0),
        weekly: weeklyStats.rows[0]
      }
    });
  } catch (err) {
    console.error('getWellnessSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export {
  getExercises,
  getExerciseById,
  getCategories,
  logSession,
  getSessions,
  deleteSession,
  logMood,
  getMoodHistory,
  deleteMoodLog,
  logStress,
  getStressHistory,
  deleteStressLog,
  addJournalEntry,
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  getWellnessSummary
};