// src/routes/notification.routes.js
import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import pool from "../config/db.config.js";
import response from "../utils/response.util.js";

const router = Router();
router.use(authMiddleware);

// GET /api/notifications/my?limit=20&offset=0
router.get("/my", async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT id, notification_type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(Number(limit), 50), Number(offset)]
    );

    const unread_count = rows.filter(n => !n.is_read).length;

    return response(res, 200, true, "Notifications retrieved", {
      notifications: rows,
      unread_count,
    });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/my/read-all  ← must be before /:id
router.patch("/my/read-all", async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return response(res, 200, true, "All notifications marked as read");
  } catch (err) { next(err); }
});

// PATCH /api/notifications/my/:id/read
router.patch("/my/:id/read", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return response(res, 404, false, "Notification not found");
    return response(res, 200, true, "Notification marked as read");
  } catch (err) { next(err); }
});

export default router;