// src/models/user.model.js
import pool from "../config/db.config.js";

class UserModel {
  static async createUser({ name, email, passwordHash, role = "user" }) {
    try {
      const query = `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at;
      `;
      const result = await pool.query(query, [name, email, passwordHash, role]);
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") throw new Error("Email already exists");
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT
        u.id, u.name, u.email, u.password_hash, u.role,
        u.is_verified, u.is_active, u.has_completed_onboarding,
        u.refresh_token,
        u.email_otp, u.email_otp_expires, u.email_otp_attempts,
        u.reset_otp, u.reset_otp_expires, u.reset_otp_attempts,
        u.created_at, u.updated_at,
        up.avatar_url
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.email = $1;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT
        u.id, u.name, u.email, u.role,
        u.is_verified, u.is_active, u.has_completed_onboarding,
        u.refresh_token,
        u.email_otp, u.email_otp_expires, u.email_otp_attempts,
        u.reset_otp, u.reset_otp_expires, u.reset_otp_attempts,
        u.created_at, u.updated_at,
        up.avatar_url
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAuthById(id) {
    const query = `
      SELECT id, password_hash, is_active, is_verified
      FROM users WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateRefreshToken(userId, token) {
    const query = `
      UPDATE users SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING id;
    `;
    const result = await pool.query(query, [token, userId]);
    return result.rows[0];
  }

  static async clearRefreshToken(userId) {
    const query = `
      UPDATE users SET refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING id;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async setEmailOtp(userId, hashedOtp, expiresAt) {
    const query = `
      UPDATE users
      SET email_otp = $1,
          email_otp_expires = $2,
          email_otp_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id;
    `;
    const result = await pool.query(query, [hashedOtp, expiresAt, userId]);
    return result.rows[0];
  }

  static async incrementEmailOtpAttempts(userId) {
    const query = `
      UPDATE users
      SET email_otp_attempts = email_otp_attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING email_otp_attempts;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async verifyEmail(userId) {
    const query = `
      UPDATE users
      SET is_verified = TRUE,
          email_otp = NULL,
          email_otp_expires = NULL,
          email_otp_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await pool.query(query, [userId]);
  }

  static async setResetOtp(email, hashedOtp, expiresAt) {
    const query = `
      UPDATE users
      SET reset_otp = $1,
          reset_otp_expires = $2,
          reset_otp_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $3
      RETURNING id, email;
    `;
    const result = await pool.query(query, [hashedOtp, expiresAt, email]);
    return result.rows[0];
  }

  static async incrementResetOtpAttempts(userId) {
    const query = `
      UPDATE users
      SET reset_otp_attempts = reset_otp_attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING reset_otp_attempts;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async clearResetOtp(userId) {
    const query = `
      UPDATE users
      SET reset_otp = NULL,
          reset_otp_expires = NULL,
          reset_otp_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await pool.query(query, [userId]);
  }

  static async updatePassword(userId, passwordHash) {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING id;
    `;
    const result = await pool.query(query, [passwordHash, userId]);
    return result.rows[0];
  }

  static async resetPassword(userId, passwordHash) {
    const query = `
      UPDATE users
      SET password_hash = $1,
          reset_otp = NULL,
          reset_otp_expires = NULL,
          reset_otp_attempts = 0,
          refresh_token = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `;
    await pool.query(query, [passwordHash, userId]);
  }

  static async setOnboardingComplete(userId) {
    const query = `
      UPDATE users
      SET has_completed_onboarding = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, has_completed_onboarding, is_verified;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async updateUserRole(userId, role) {
    const query = `
      UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, updated_at;
    `;
    const result = await pool.query(query, [role, userId]);
    return result.rows[0];
  }

  static async updateUserStatus(userId, isActive) {
    const query = `
      UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, is_active, updated_at;
    `;
    const result = await pool.query(query, [isActive, userId]);
    return result.rows[0];
  }

  static async countUsers() {
    const query = `SELECT COUNT(*) as count FROM users;`;
    const result = await pool.query(query);
    return Number(result.rows[0].count);
  }

  static async getAllUsers({ limit = 10, offset = 0, role, search }) {
    let baseConditions = `FROM users WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (role) {
      baseConditions += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (search) {
      baseConditions += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount += 2;
    }

    const countQuery = `SELECT COUNT(*) as count ${baseConditions}`;
    const countResult = await pool.query(countQuery, params);
    const total = Number(countResult.rows[0].count);

    const dataQuery = `
      SELECT id, name, email, role, created_at, is_active
      ${baseConditions}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(dataQuery, params);
    return { users: result.rows, total };
  }

  static async deleteUser(userId) {
    const query = `DELETE FROM users WHERE id = $1 RETURNING id;`;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

export default UserModel;
