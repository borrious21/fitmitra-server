import ProfileModel from "../../models/profile.model.js";
import pool from "../../config/db.config.js";
import cloudinary from "../../config/cloudinary.js";

class ProfileController {

  static async getMyProfile(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }

      // Pull avatar_url from user_preferences (that's where uploadProfilePicture saves it)
      const { rows } = await pool.query(
        "SELECT avatar_url FROM user_preferences WHERE user_id = $1",
        [req.user.id]
      );
      const avatar_url = rows[0]?.avatar_url ?? null;

      return res.json({
        success: true,
        data: { ...profile, avatar_url },   // merged into the profile object
      });
    } catch (error) {
      next(error);
    }
  }

  static async createProfile(req, res, next) {
    try {
      const existingProfile = await ProfileModel.findByUserId(req.user.id);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: "Profile already exists. Use PUT to update.",
          code: "PROFILE_ALREADY_EXISTS",
        });
      }

      const profile = await ProfileModel.create(req.user.id, req.body);

      await pool.query(
        "UPDATE users SET has_completed_onboarding = true WHERE id = $1",
        [req.user.id]
      );

      return res.status(201).json({
        success: true,
        message: "Profile created successfully",
        data: profile,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "VALIDATION_ERROR",
          errors: error.details || [],
        });
      }
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const profile = await ProfileModel.update(req.user.id, req.body);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
          code: "PROFILE_NOT_FOUND",
        });
      }
      return res.json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "VALIDATION_ERROR",
          errors: error.details || [],
        });
      }
      next(error);
    }
  }

  static async deleteMyProfile(req, res, next) {
    try {
      const deleted = await ProfileModel.delete(req.user.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
          code: "PROFILE_NOT_FOUND",
        });
      }

      await pool.query(
        "UPDATE users SET has_completed_onboarding = false WHERE id = $1",
        [req.user.id]
      );

      return res.json({ success: true, message: "Profile deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async checkProfile(req, res, next) {
    try {
      const exists = await ProfileModel.exists(req.user.id);
      return res.json({ success: true, data: { exists } });
    } catch (error) {
      next(error);
    }
  }

  static async getAllProfiles(req, res, next) {
    try {
      const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const profiles = await ProfileModel.findAll(limit, offset);
      return res.json({
        success: true,
        count: profiles.length,
        pagination: { limit, offset },
        data: profiles,
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadProfilePicture(req, res, next) {
    try {
      if (!req.files || !req.files.avatar) {
        return res.status(400).json({
          success: false,
          message: "No file provided. Send the image as form-data with the key 'avatar'.",
        });
      }

      const file = req.files.avatar;

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ success: false, message: "Only image files are allowed" });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: "File must be under 5 MB" });
      }

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "fitmitra_profiles",
        transformation: [
          { width: 300, height: 300, crop: "fill", gravity: "face" },
        ],
      });

      const avatarUrl = result.secure_url;

      await pool.query(
        `INSERT INTO user_preferences (user_id, avatar_url)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = NOW()`,
        [req.user.id, avatarUrl]
      );

      return res.json({
        success: true,
        message: "Profile photo updated",
        data: { avatar_url: avatarUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCalorieRecommendation(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }
      const recommendation = calculateRecommendedCalories(profile);
      if (!recommendation) {
        return res.status(400).json({
          success: false,
          message: "Unable to calculate calorie recommendation",
          code: "CALCULATION_FAILED",
        });
      }
      return res.json({ success: true, message: "Calorie recommendation generated", data: recommendation });
    } catch (error) {
      next(error);
    }
  }

  static async getMacroSplit(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }
      const macros = calculateMacroSplit(profile);
      if (!macros) {
        return res.status(400).json({
          success: false,
          message: "Unable to calculate macros",
          code: "MACRO_CALCULATION_FAILED",
        });
      }
      return res.json({ success: true, message: "Macro split generated", data: macros });
    } catch (error) {
      next(error);
    }
  }

  static async getMealWiseMacros(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }
      const result = calculateMealWiseMacros(profile);
      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Unable to calculate meal-wise macros",
          code: "MEAL_MACRO_CALCULATION_FAILED",
        });
      }
      return res.json({ success: true, message: "Meal-wise macro split generated", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMealSuggestions(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }
      const suggestions = generateMealSuggestions(profile);
      if (!suggestions) {
        return res.status(400).json({
          success: false,
          message: "Unable to generate meal suggestions",
          code: "MEAL_SUGGESTIONS_FAILED",
        });
      }
      return res.json({ success: true, message: "Meal suggestions generated", data: suggestions });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkoutPlan(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }
      const plan = generateWorkoutPlan(profile);
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: "Unable to generate workout plan",
          code: "WORKOUT_GENERATION_FAILED",
        });
      }
      return res.json({ success: true, message: "Workout plan generated", data: plan });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const profile = await ProfileModel.findByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not created yet",
          code: "PROFILE_NOT_FOUND",
        });
      }

      const [
        workoutStats,
        streak,
        achievements,
        latestProgress,
        progressTrends,
        recentWorkouts,
        prefs,                              // ← also pull avatar here
      ] = await Promise.all([
        WorkoutModel.getWorkoutStats(req.user.id, 30),
        ProfileController.getUserStreak(req.user.id),
        WorkoutModel.getUserAchievements(req.user.id),
        ProgressModel.getLatestProgress(req.user.id),
        ProgressModel.getProgressTrends(req.user.id, 30),
        WorkoutModel.getWorkoutHistory(req.user.id, { limit: 5, offset: 0 }),
        pool.query("SELECT avatar_url FROM user_preferences WHERE user_id = $1", [req.user.id]),
      ]);

      const avatar_url = prefs.rows[0]?.avatar_url ?? null;

      const data = {
        profile: { ...profile, avatar_url },
        metrics: {
          calories: calculateRecommendedCalories(profile),
          macros: calculateMacroSplit(profile),
          mealPlan: calculateMealWiseMacros(profile),
        },
        suggestions: {
          meals: generateMealSuggestions(profile),
          workout: generateWorkoutPlan(profile),
        },
        activity: {
          workoutStats,
          streak,
          achievements: achievements.slice(0, 5),
          recentWorkouts,
        },
        progress: {
          latest: latestProgress,
          trends: progressTrends,
        },
      };

      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminAnalytics(req, res, next) {
    try {
      const goal          = req.query.goal;
      const activityLevel = req.query.activity_level;
      const dietType      = req.query.diet_type;

      let whereClause = "WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (goal)          { params.push(goal);          whereClause += ` AND goal = $${++paramCount}`; }
      if (activityLevel) { params.push(activityLevel); whereClause += ` AND activity_level = $${++paramCount}`; }
      if (dietType)      { params.push(dietType);      whereClause += ` AND diet_type = $${++paramCount}`; }

      const { rows: overview } = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          AVG(age) as avg_age,
          goal,
          activity_level,
          diet_type,
          COUNT(*) as user_count
        FROM profiles
        ${whereClause}
        GROUP BY goal, activity_level, diet_type
        ORDER BY user_count DESC
      `, params);

      const { rows: healthMetrics } = await pool.query(`
        SELECT
          AVG(bmi) as avg_bmi,
          AVG(bmr) as avg_bmr,
          AVG(tdee) as avg_tdee,
          COUNT(CASE WHEN bmi < 18.5 THEN 1 END) as underweight_count,
          COUNT(CASE WHEN bmi >= 18.5 AND bmi < 25 THEN 1 END) as normal_count,
          COUNT(CASE WHEN bmi >= 25 AND bmi < 30 THEN 1 END) as overweight_count,
          COUNT(CASE WHEN bmi >= 30 THEN 1 END) as obese_count
        FROM profiles
        ${whereClause}
      `, params);

      const { rows: atRisk } = await pool.query(`
        SELECT user_id, age, bmi, medical_conditions
        FROM profiles
        WHERE bmi > 30 OR bmi < 18.5
        OR medical_conditions->>'high_blood_pressure' = 'true'
        OR medical_conditions->>'diabetes' = 'true'
        ${whereClause.replace("WHERE 1=1", "")}
        ORDER BY bmi DESC
        LIMIT 20
      `, params);

      const { rows: workoutStats } = await pool.query(`
        SELECT
          COUNT(DISTINCT user_id) as active_users_last_30d,
          COUNT(*) as total_workouts_last_30d,
          AVG(duration_minutes) as avg_workout_duration
        FROM workout_logs
        WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      return res.json({
        success: true,
        data: {
          overview,
          healthMetrics: healthMetrics[0],
          atRiskUsers: atRisk,
          workoutStats: workoutStats[0],
          filters: { goal, activityLevel, dietType },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserStreak(userId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT workout_date FROM workout_logs WHERE user_id = $1 ORDER BY workout_date DESC`,
      [userId]
    );

    let streak    = 0;
    let checkDate = new Date();

    for (const log of rows) {
      const logDate  = new Date(log.workout_date);
      const diffDays = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) { streak++; checkDate = logDate; }
      else break;
    }
    return streak;
  }
}

export default ProfileController;