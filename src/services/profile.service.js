import ProfileModel from "../models/profile.model.js";
import pool from "../config/db.config.js";
import { calculateRecommendedCalories, calculateMacroSplit, calculateMealWiseMacros }
  from "../domain/nutrition.rules.js";
import { generateMealSuggestions } from "../domain/meal.generator.js";

class ProfileService {
  static async getMyProfile(userId) {
    return ProfileModel.findByUserId(userId);
  }

  static async createProfile(userId, data) {
    const exists = await ProfileModel.exists(userId);
    if (exists) {
      const err = new Error("Profile already exists");
      err.statusCode = 409;
      err.code = "PROFILE_ALREADY_EXISTS";
      throw err;
    }

    const profile = await ProfileModel.create(userId, data);

    await pool.query(
      "UPDATE users SET has_completed_onboarding = true WHERE id = $1",
      [userId]
    );

    return profile;
  }

  static async updateProfile(userId, data) {
    const exists = await ProfileModel.exists(userId);
    if (!exists) {
      const err = new Error("Profile not found");
      err.statusCode = 404;
      err.code = "PROFILE_NOT_FOUND";
      throw err;
    }
    return ProfileModel.update(userId, data);
  }

  static async deleteProfile(userId) {
    const deleted = await ProfileModel.delete(userId);
    if (!deleted) {
      const err = new Error("Profile not found");
      err.statusCode = 404;
      err.code = "PROFILE_NOT_FOUND";
      throw err;
    }

    // Reset onboarding flag when profile is deleted
    await pool.query(
      "UPDATE users SET has_completed_onboarding = false WHERE id = $1",
      [userId]
    );

    return true;
  }

  static async checkProfile(userId) {
    return ProfileModel.exists(userId);
  }

  static async getCalorieRecommendation(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    return profile ? calculateRecommendedCalories(profile) : null;
  }

  static async getMacroSplit(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    return profile ? calculateMacroSplit(profile) : null;
  }

  static async getMealWiseMacros(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    return profile ? calculateMealWiseMacros(profile) : null;
  }

  static async getMealSuggestions(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    return profile ? generateMealSuggestions(profile) : null;
  }

  static async getAllProfiles(limit, offset) {
    return ProfileModel.findAll(limit, offset);
  }

  static async getUserProfile(userId) {
    return ProfileModel.findByUserId(userId);
  }

  static async getFullProfile(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    if (!profile) return null;
    return {
      profile,
      calories: calculateRecommendedCalories(profile),
      macros: calculateMacroSplit(profile),
      meals: generateMealSuggestions(profile),
    };
  }
}

export default ProfileService;