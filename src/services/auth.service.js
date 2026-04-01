// src/services/auth.service.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import UserModel from "../models/user.model.js";
// import ProfileModel from "../models/profile.model.js";
import AuthError from "../errors/auth.error.js";
import {
  jwtSecret,
  jwtRefreshSecret,
  jwtExpiresIn,
  jwtRefreshExpiresIn,
} from "../config/jwt.config.js";
import {
  createEmailOtp,
  verifyEmailOtp,
  createResetOtp,
  verifyResetOtp,
} from "./Otp.service.js";
import {
  sendVerificationOtp,
  sendPasswordResetOtp,
} from "./Email.service.js";

const ACTIVITY_LEVEL_MAP = {
  sedentary: "sedentary",
  light:     "lightly_active",
  moderate:  "moderately_active",
  very:      "very_active",
  athlete:   "very_active",
};

const GOAL_MAP = {
  fatLoss:    "weight_loss",
  muscleGain: "muscle_gain",
  maintain:   "maintenance",
  endurance:  "maintenance",
};

const DIET_TYPE_MAP = {
  vegetarian: "veg",
  vegan:      "veg",
  nonVeg:     "non_veg",
  eggetarian: "eggetarian",
};

class AuthService {
  static async register(payload) {
    const { name, email, password } = payload;

    if (!name || !email || !password) {
      throw new AuthError("Name, email and password are required", 400);
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new AuthError("Email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await UserModel.createUser({ name, email, passwordHash, role: "user" });
    } catch (err) {
      throw new AuthError(err.message || "Registration failed", 500);
    }

    const otp = await createEmailOtp(user.id);
    await sendVerificationOtp(email, otp);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    };
  }

  static async verifyEmail(email, otp) {
    if (!email || !otp) {
      throw new AuthError("Email and OTP are required", 400);
    }

    const user = await UserModel.findByEmail(email);

    if (!user) {
      throw new AuthError("Invalid email or OTP", 400);
    }

    const result = await verifyEmailOtp(user.id, otp);
    if (!result.valid) {
      throw new AuthError(result.reason, 400);
    }

    await UserModel.verifyEmail(user.id);
    return true;
  }

  static async resendVerification(email) {
    if (!email) {
      throw new AuthError("Email is required", 400);
    }

    const user = await UserModel.findByEmail(email);
    if (!user) return true;

    if (user.is_verified) {
      throw new AuthError("Email is already verified", 400);
    }

    const otp = await createEmailOtp(user.id);
    await sendVerificationOtp(email, otp);
    return true;
  }

  static async login(payload) {
    const { email, password } = payload;

    if (!email || !password) {
      throw new AuthError("Email and password are required", 400);
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or password", 401);
    }

    if (!user.is_verified) {
      throw new AuthError("Please verify your email before logging in", 403);
    }

    if (user.is_active === false) {
      throw new AuthError("Account is deactivated", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AuthError("Invalid email or password", 401);
    }

    const { accessToken, refreshToken } = await AuthService._issueTokenPair(user);

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: user.has_completed_onboarding ?? false,
        isVerified: user.is_verified ?? false,
      },
    };
  }
  static async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AuthError("Refresh token is required", 400);
    }

    try {
      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
      const user = await UserModel.findById(decoded.id);

      if (!user || !user.refresh_token) {
        throw new AuthError("Invalid refresh token", 401);
      }

      const hashedIncoming = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const storedBuf   = Buffer.from(user.refresh_token, "utf8");
      const incomingBuf = Buffer.from(hashedIncoming, "utf8");

      if (
        storedBuf.length !== incomingBuf.length ||
        !crypto.timingSafeEqual(storedBuf, incomingBuf)
      ) {
        throw new AuthError("Invalid refresh token", 401);
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService._issueTokenPair(user);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Invalid or expired refresh token", 401);
    }
  }

  static async requestPasswordReset(email) {
    if (!email) {
      throw new AuthError("Email is required", 400);
    }

    const user = await UserModel.findByEmail(email);
    if (!user) return true;

    const otp = await createResetOtp(email);
    await sendPasswordResetOtp(email, otp);
    return true;
  }
  static async verifyResetOtp(email, otp) {
    if (!email || !otp) {
      throw new AuthError("Email and OTP are required", 400);
    }

    const result = await verifyResetOtp(email, otp);
    if (!result.valid) {
      throw new AuthError(result.reason, 400);
    }

    return true;
  }

  static async resetPassword(email, otp, newPassword) {
    if (!email || !otp || !newPassword) {
      throw new AuthError("Email, OTP and new password are required", 400);
    }

    if (newPassword.length < 8) {
      throw new AuthError("Password must be at least 8 characters", 400);
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or OTP", 400);
    }
    const result = await verifyResetOtp(email, otp);
    if (!result.valid) {
      throw new AuthError(result.reason, 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.resetPassword(user.id, passwordHash);

    return true;
  }
  static async changePassword(userId, currentPassword, newPassword) {
    if (!userId) throw new AuthError("Unauthorized", 401);

    if (!currentPassword || !newPassword) {
      throw new AuthError("Current password and new password are required", 400);
    }

    if (newPassword.length < 8) {
      throw new AuthError("New password must be at least 8 characters", 400);
    }

    const user = await UserModel.findAuthById(userId);
    if (!user) throw new AuthError("User not found", 404);

    if (user.is_active === false) throw new AuthError("Account is deactivated", 403);

    if (!user.is_verified) throw new AuthError("Please verify your email first", 403);

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new AuthError("Current password is incorrect", 400);

    const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsOld) {
      throw new AuthError("New password must be different from current password", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(userId, passwordHash);
    await UserModel.clearRefreshToken(userId);

    return true;
  }

  static async completeOnboarding(userId, onboardingData) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AuthError("User not found", 404);

    if (!onboardingData) throw new AuthError("Onboarding data is required", 400);

    const validHeightUnits = ["cm", "ft"];
    const validWeightUnits = ["kg", "lbs"];

    if (!validHeightUnits.includes(onboardingData.heightUnit)) {
      throw new AuthError(`heightUnit must be one of: ${validHeightUnits.join(", ")}`, 400);
    }

    if (!validWeightUnits.includes(onboardingData.weightUnit)) {
      throw new AuthError(`weightUnit must be one of: ${validWeightUnits.join(", ")}`, 400);
    }

    let heightInCm = parseFloat(onboardingData.height);
    if (onboardingData.heightUnit === "ft") heightInCm = heightInCm * 30.48;

    let weightInKg = parseFloat(onboardingData.weight);
    if (onboardingData.weightUnit === "lbs") weightInKg = weightInKg * 0.453592;
    const rawActivityLevel = onboardingData.activityLevel;
    if (!ACTIVITY_LEVEL_MAP[rawActivityLevel]) {
      throw new AuthError(
        `activityLevel must be one of: ${Object.keys(ACTIVITY_LEVEL_MAP).join(", ")}`,
        400
      );
    }

    const rawGoal = onboardingData.goal;
    if (!GOAL_MAP[rawGoal]) {
      throw new AuthError(
        `goal must be one of: ${Object.keys(GOAL_MAP).join(", ")}`,
        400
      );
    }

    const dietPreference = Array.isArray(onboardingData.diet)
      ? onboardingData.diet[0]
      : onboardingData.diet;

    const medicalConditions = {
      diabetes:            onboardingData.conditions?.includes("diabetes")  ?? false,
      high_blood_pressure: onboardingData.conditions?.includes("highBP")    ?? false,
      pcod:                onboardingData.conditions?.includes("pcod")       ?? false,
      thyroid:             onboardingData.conditions?.includes("thyroid")    ?? false,
      injuries:            onboardingData.conditions?.includes("injuries")   ?? false,
    };

    const profileData = {
      age:            parseInt(onboardingData.age, 10),
      gender:         onboardingData.gender,
      height_cm:      Math.round(heightInCm),
      weight_kg:      parseFloat(weightInKg.toFixed(1)),
      activity_level: ACTIVITY_LEVEL_MAP[rawActivityLevel],
      goal:           GOAL_MAP[rawGoal],
      diet_type:      DIET_TYPE_MAP[dietPreference] ?? dietPreference,
      medical_conditions: medicalConditions,
    };

    const validationErrors = [];
    if (isNaN(profileData.age)) {
      validationErrors.push("Age must be a valid number");
    } else if (profileData.age < 13 || profileData.age > 80) {
      validationErrors.push("Age must be between 13 and 80");
    }

    if (profileData.height_cm < 100 || profileData.height_cm > 250)
      validationErrors.push("Height must be between 100 and 250 cm");
    if (profileData.weight_kg < 30 || profileData.weight_kg > 250)
      validationErrors.push("Weight must be between 30 and 250 kg");
    if (!["male", "female", "other"].includes(profileData.gender))
      validationErrors.push("Gender must be male, female, or other");
    if (!["veg", "non_veg", "eggetarian"].includes(profileData.diet_type))
      validationErrors.push("Diet type must be veg, non_veg, or eggetarian");

    if (validationErrors.length > 0) {
      throw new AuthError(`Validation failed: ${validationErrors.join(", ")}`, 400);
    }

    const existingProfile = await ProfileModel.findByUserId(userId);
    const profile = existingProfile
      ? await ProfileModel.update(userId, profileData)
      : await ProfileModel.create(userId, profileData);

    const updatedUser = await UserModel.setOnboardingComplete(userId);

    return {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        hasCompletedOnboarding: updatedUser.has_completed_onboarding,
        isVerified: updatedUser.is_verified,
      },
      profile,
    };
  }

  static async logout(userId) {
    if (!userId) throw new AuthError("Unauthorized", 401);
    await UserModel.clearRefreshToken(userId);
    return true;
  }

  static async _issueTokenPair(user) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      jwtRefreshSecret,
      { expiresIn: jwtRefreshExpiresIn }
    );

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await UserModel.updateRefreshToken(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }
}

export default AuthService;