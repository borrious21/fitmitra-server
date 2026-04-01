// admin/utils/adminLogger.js
import pool from "../../config/db.config.js";

const logAdminAction = async (adminId, action, payload = {}) => {
  try {
     const { target_user_id = null, ...rest } = payload;

    await pool.query(
      `INSERT INTO admin_logs (admin_id, target_user_id, action, payload, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [adminId, target_user_id || null, action, JSON.stringify(rest)]
    );
  } catch (err) {
    console.error("[adminLogger] Failed to write admin log:", err.message);
  }
};

export default logAdminAction;