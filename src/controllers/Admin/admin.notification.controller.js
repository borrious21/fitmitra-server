// admin/controllers/notificationsController.js
import pool from "../../config/db.config.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

const VALID_TYPES = ["info", "warning", "achievement", "reminder", "system"];

class NotificationsController {

  static async getNotifications(req, res, next) {
    try {
      const { limit = 50, offset = 0, user_id, type } = req.query;
      const params = [];
      let where = "WHERE 1=1";

      if (user_id) { params.push(user_id); where += ` AND user_id = $${params.length}`; }
      if (type)    { params.push(type);    where += ` AND notification_type = $${params.length}`; }

      params.push(Math.min(Number(limit), 100), Number(offset));

      const { rows } = await pool.query(
        `SELECT * FROM notifications
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) FROM notifications ${where}`,
        params.slice(0, -2)
      );

      return response(res, 200, true, "Notifications retrieved", {
        notifications: rows,
        total: Number(countRows[0].count),
        pagination: { limit: Number(limit), offset: Number(offset) },
      });
    } catch (err) { next(err); }
  }

  static async sendNotification(req, res, next) {
    try {
      const { user_id, title, message, notification_type = "info" } = req.body || {};

      if (!user_id || !title || !message) {
        return response(res, 400, false, "user_id, title and message are required");
      }

      if (!VALID_TYPES.includes(notification_type)) {
        return response(res, 400, false, `notification_type must be one of: ${VALID_TYPES.join(", ")}`);
      }

      const { rows } = await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [user_id, notification_type, title, message]
      );

      await logAdminAction(req.user.id, "SEND_NOTIFICATION", {
        target_user_id: user_id,
        notification_id: rows[0].id,
      });

      return response(res, 201, true, "Notification sent successfully", rows[0]);
    } catch (err) { next(err); }
  }

  static async broadcastNotification(req, res, next) {
    try {
      const { title, message, notification_type = "system", target = "all" } = req.body || {};

      if (!title || !message) {
        return response(res, 400, false, "title and message are required");
      }

      if (!VALID_TYPES.includes(notification_type)) {
        return response(res, 400, false, `notification_type must be one of: ${VALID_TYPES.join(", ")}`);
      }

      let userFilter = "";
      if (target === "verified") userFilter = "WHERE is_verified = true";
      else if (target === "active") {
        userFilter = `WHERE id IN (
          SELECT DISTINCT user_id FROM workout_logs
          WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
        )`;
      }

      const { rows: users } = await pool.query(
        `SELECT id FROM users ${userFilter}`
      );

      if (!users.length) {
        return response(res, 200, true, "No users matched the target criteria", { sent: 0 });
      }
      
      const ids = users.map(u => u.id);
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, created_at)
         SELECT u.id, $1, $2, $3, NOW()
         FROM unnest($4::int[]) AS u(id)`,
        [notification_type, title, message, ids]
      );

      await logAdminAction(req.user.id, "BROADCAST_NOTIFICATION", {
        target,
        recipient_count: ids.length,
        title,
      });

      return response(res, 201, true, `Broadcast sent to ${ids.length} users`, {
        sent: ids.length,
        target,
      });
    } catch (err) { next(err); }
  }

  /** DELETE /admin/notifications/:id */
  static async deleteNotification(req, res, next) {
    try {
      const { rows } = await pool.query(
        `DELETE FROM notifications WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (!rows.length) return response(res, 404, false, "Notification not found");
      await logAdminAction(req.user.id, "DELETE_NOTIFICATION", { notification_id: req.params.id });
      return response(res, 200, true, "Notification deleted successfully");
    } catch (err) { next(err); }
  }
}

export default NotificationsController;