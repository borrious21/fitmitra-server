// src/controllers/auth.controller.js
import AuthService from "../../services/auth.service.js";
import AuthError from "../../errors/auth.error.js";
import response from "../../utils/response.util.js";

class AuthController {
  static async signup(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      return response(
        res,
        201,
        true,
        "Account created. A 6-digit OTP has been sent to your email.",
        user
      );
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      return response(res, 200, true, "Login successful", result);
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        return next(new AuthError("Refresh token is required", 400));
      }
      const result = await AuthService.refresh(refreshToken);
      return response(res, 200, true, "Token refreshed successfully", result);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const { id, name, email, role, has_completed_onboarding, is_verified, avatar_url } = req.user;
      return response(res, 200, true, "User profile retrieved", {
        id,
        name,
        email,
        role,
        hasCompletedOnboarding: has_completed_onboarding ?? false,
        isVerified: is_verified ?? false,
        avatar_url: avatar_url ?? null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const { email, otp } = req.body || {};
      if (!email || !otp) {
        return next(new AuthError("email and otp are required", 400));
      }
      await AuthService.verifyEmail(email, otp);
      return response(res, 200, true, "Email verified successfully");
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req, res, next) {
    try {
      await AuthService.resendVerification(req.body?.email);
      return response(
        res,
        200,
        true,
        "If that email exists and is unverified, a new OTP has been sent"
      );
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body || {};
      if (!email) {
        return next(new AuthError("Email is required", 400));
      }
      await AuthService.requestPasswordReset(email);
      return response(
        res,
        200,
        true,
        "If that email exists, a password reset OTP has been sent"
      );
    } catch (error) {
      next(error);
    }
  }

  static async verifyResetOtp(req, res, next) {
    try {
      const { email, otp } = req.body || {};
      if (!email || !otp) {
        return next(new AuthError("email and otp are required", 400));
      }
      await AuthService.verifyResetOtp(email, otp);
      return response(res, 200, true, "OTP verified. You may now set a new password.");
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body || {};
      if (!email || !otp || !newPassword) {
        return next(new AuthError("email, otp and newPassword are required", 400));
      }
      await AuthService.resetPassword(email, otp, newPassword);
      return response(res, 200, true, "Password reset successful. Please log in.");
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      return response(res, 200, true, "Password changed successfully");
    } catch (error) {
      next(error);
    }
  }

  static async completeOnboarding(req, res, next) {
    try {
      const onboardingData = req.body;

      if (!onboardingData || Object.keys(onboardingData).length === 0) {
        return next(new AuthError("No onboarding data provided", 400));
      }

      const requiredFields = [
        "age", "gender", "height", "heightUnit",
        "weight", "weightUnit", "activityLevel", "goal", "diet",
      ];

      const missingFields = requiredFields.filter(
        (f) =>
          onboardingData[f] === undefined ||
          onboardingData[f] === null ||
          onboardingData[f] === ""
      );

      if (missingFields.length > 0) {
        const err = new AuthError("Missing required fields", 400, "VALIDATION_ERROR");
        err.meta = { missingFields };
        return next(err);
      }

      const result = await AuthService.completeOnboarding(req.user.id, onboardingData);
      return response(res, 200, true, "Onboarding completed successfully", result);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    await AuthService.logout(refreshToken);
    return response(res, 200, true, "Logged out successfully");
  } catch (error) {
    next(error);
  }
  }
}

export default AuthController;