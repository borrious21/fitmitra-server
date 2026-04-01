// src/routes/auth.routes.js
import { Router } from "express";
import AuthController from "../controllers/User/auth.controller.js";
import authenticate, { requireVerified } from "../middlewares/auth.middleware.js";

const router = Router();

// URL: /api/auth/signup
router.post("/signup", AuthController.signup);

// URL: /api/auth/login
router.post("/login", AuthController.login);

// URL: /api/auth/refresh
router.post("/refresh", AuthController.refresh);

// URL: /api/auth/verify-email
router.post("/verify-email", AuthController.verifyEmail);

// URL: /api/auth/resend-verification
router.post("/resend-verification", AuthController.resendVerification);

// URL: /api/auth/forgot-password
router.post("/forgot-password", AuthController.forgotPassword);

// URL: /api/auth/verify-reset-otp
router.post("/verify-reset-otp", AuthController.verifyResetOtp);

// URL: /api/auth/reset-password
router.post("/reset-password", AuthController.resetPassword);

// URL: /api/auth/me
router.get("/me", authenticate, AuthController.getMe);

// URL: /api/auth/logout
router.post("/logout", authenticate, AuthController.logout);

// URL: /api/auth/change-password
router.post("/change-password", authenticate, requireVerified, AuthController.changePassword);

// URL: /api/auth/complete-onboarding
router.post("/complete-onboarding", authenticate, requireVerified, AuthController.completeOnboarding);

export default router;
