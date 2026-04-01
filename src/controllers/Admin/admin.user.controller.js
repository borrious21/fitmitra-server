// controllers/Admin/admin.user.controller.js
import bcrypt from "bcryptjs";
import * as UsersService from "../../services/Admin/UsersService.js";
import { validateUserUpdate } from "../../validators/admin/user.validator.js";
import logAdminAction from "../../utils/admin/admin.logger.js";
import response from "../../utils/response.util.js";

class UsersController {

  static async getAllUsers(req, res, next) {
    try {
      const { limit = 50, offset = 0, search = "", role = "" } = req.query;
      const data = await UsersService.getAllUsers({
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
        search,
        role,
      });
      return response(res, 200, true, "Users retrieved", {
        ...data,
        pagination: { limit: Number(limit), offset: Number(offset), total: data.total },
      });
    } catch (err) { next(err); }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await UsersService.getUserById(req.params.id);
      if (!user) {
        return response(res, 404, false, "User not found");
      }
      return response(res, 200, true, "User retrieved", user);
    } catch (err) { next(err); }
  }

  // Sets is_active = false (schema has no is_banned column)
  static async banUser(req, res, next) {
    try {
      if (String(req.params.id) === String(req.user.id)) {
        return response(res, 400, false, "You cannot ban your own account");
      }
      const user = await UsersService.banUser(req.params.id);
      if (!user) return response(res, 404, false, "User not found");

      await logAdminAction(req.user.id, "BAN_USER", { target_user_id: Number(req.params.id) });
      return response(res, 200, true, "User banned successfully", user);
    } catch (err) { next(err); }
  }

  // Sets is_active = true
  static async activateUser(req, res, next) {
    try {
      const user = await UsersService.activateUser(req.params.id);
      if (!user) return response(res, 404, false, "User not found");

      await logAdminAction(req.user.id, "ACTIVATE_USER", { target_user_id: Number(req.params.id) });
      return response(res, 200, true, "User activated successfully", user);
    } catch (err) { next(err); }
  }

  static async verifyUser(req, res, next) {
    try {
      const user = await UsersService.verifyUser(req.params.id);
      if (!user) return response(res, 404, false, "User not found");

      await logAdminAction(req.user.id, "VERIFY_USER", { target_user_id: Number(req.params.id) });
      return response(res, 200, true, "User verified successfully", user);
    } catch (err) { next(err); }
  }

  static async deleteUser(req, res, next) {
    try {
      if (String(req.params.id) === String(req.user.id)) {
        return response(res, 400, false, "You cannot delete your own account");
      }

      const user = await UsersService.deleteUser(req.params.id);
      if (!user) return response(res, 404, false, "User not found");

      await logAdminAction(req.user.id, "DELETE_USER", { target_user_id: Number(req.params.id) });
      return response(res, 200, true, "User deleted successfully");
    } catch (err) { next(err); }
  }

  static async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body || {};
      if (!newPassword || newPassword.length < 8) {
        return response(res, 400, false, "newPassword must be at least 8 characters");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const user = await UsersService.resetUserPassword(req.params.id, hashedPassword);
      if (!user) return response(res, 404, false, "User not found");

      await logAdminAction(req.user.id, "RESET_USER_PASSWORD", { target_user_id: Number(req.params.id) });
      return response(res, 200, true, "Password reset successfully");
    } catch (err) { next(err); }
  }
}

export default UsersController;