// src/services/Otp.service.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import UserModel from "../models/user.model.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a secure numeric OTP of a given length.
 */
function generateOtp(length = OTP_LENGTH) {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  // Use crypto for secure random generation
  const range = max - min;
  const randomBytes = crypto.randomBytes(4);
  const randomNum = randomBytes.readUInt32BE(0);
  return String(min + (randomNum % range));
}

// ── Email verification OTP ──────────────────────────────────────────────────

/**
 * Creates a hashed email OTP and stores it against the user.
 * Returns the plaintext OTP to be emailed.
 */
export async function createEmailOtp(userId) {
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await UserModel.setEmailOtp(userId, hashedOtp, expiresAt);
  return otp;
}

/**
 * Verifies a plaintext email OTP against the stored hash.
 * Tracks attempts and locks out after MAX_OTP_ATTEMPTS.
 * Returns { valid: boolean, reason?: string }
 */
export async function verifyEmailOtp(userId, otp) {
  const user = await UserModel.findById(userId);

  if (!user) {
    return { valid: false, reason: "User not found" };
  }

  if (!user.email_otp || !user.email_otp_expires) {
    return { valid: false, reason: "No OTP found. Please request a new one." };
  }

  // Check attempt limit BEFORE verifying to prevent brute force
  if (user.email_otp_attempts >= MAX_OTP_ATTEMPTS) {
    return {
      valid: false,
      reason: `Too many failed attempts. Please request a new OTP.`,
    };
  }

  if (new Date() > new Date(user.email_otp_expires)) {
    return { valid: false, reason: "OTP has expired. Please request a new one." };
  }

  const isMatch = await bcrypt.compare(otp, user.email_otp);

  if (!isMatch) {
    // Increment attempt counter on failure
    await UserModel.incrementEmailOtpAttempts(userId);
    const attemptsLeft = MAX_OTP_ATTEMPTS - (user.email_otp_attempts + 1);
    return {
      valid: false,
      reason: attemptsLeft > 0
        ? `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : "Too many failed attempts. Please request a new OTP.",
    };
  }

  return { valid: true };
}

// ── Password reset OTP ──────────────────────────────────────────────────────

/**
 * Creates a hashed reset OTP and stores it against the user (by email).
 * Returns the plaintext OTP to be emailed.
 */
export async function createResetOtp(email) {
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await UserModel.setResetOtp(email, hashedOtp, expiresAt);
  return otp;
}

/**
 * Verifies a plaintext reset OTP against the stored hash.
 * Looks up user by email. Tracks attempts and locks out after MAX_OTP_ATTEMPTS.
 * Returns { valid: boolean, reason?: string }
 */
export async function verifyResetOtp(email, otp) {
  const user = await UserModel.findByEmail(email);

  if (!user) {
    // Generic message to prevent user enumeration
    return { valid: false, reason: "Invalid email or OTP." };
  }

  if (!user.reset_otp || !user.reset_otp_expires) {
    return { valid: false, reason: "No OTP found. Please request a new one." };
  }

  // Check attempt limit BEFORE verifying
  if (user.reset_otp_attempts >= MAX_OTP_ATTEMPTS) {
    return {
      valid: false,
      reason: "Too many failed attempts. Please request a new OTP.",
    };
  }

  if (new Date() > new Date(user.reset_otp_expires)) {
    return { valid: false, reason: "OTP has expired. Please request a new one." };
  }

  const isMatch = await bcrypt.compare(otp, user.reset_otp);

  if (!isMatch) {
    await UserModel.incrementResetOtpAttempts(user.id);
    const attemptsLeft = MAX_OTP_ATTEMPTS - (user.reset_otp_attempts + 1);
    return {
      valid: false,
      reason: attemptsLeft > 0
        ? `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : "Too many failed attempts. Please request a new OTP.",
    };
  }

  return { valid: true };
}