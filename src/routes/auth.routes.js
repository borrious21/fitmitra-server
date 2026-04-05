// src/routes/auth.routes.js
import { Router } from "express";
import AuthController from "../controllers/User/auth.controller.js";
import authenticate, { requireVerified } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/resend-verification", AuthController.resendVerification);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-otp", AuthController.verifyResetOtp);
router.post("/reset-password", AuthController.resetPassword);
router.get("/me", authenticate, AuthController.getMe);
router.post("/logout", AuthController.logout);  
router.post("/change-password", authenticate, requireVerified, AuthController.changePassword);
router.post("/complete-onboarding", authenticate, requireVerified, AuthController.completeOnboarding);

export default router;