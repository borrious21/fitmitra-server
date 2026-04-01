import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import ProfileController from "../controllers/User/profle.controller.js";
import fileUpload from "express-fileupload";

const router = Router();

router.use(fileUpload({ useTempFiles: true }));

// URL: /api/profile/avatar
router.post("/avatar", authMiddleware, ProfileController.uploadProfilePicture);

// URL: /api/profile/me
router.get("/me", authMiddleware, ProfileController.getMyProfile);

// URL: /api/profile
router.post("/", authMiddleware, ProfileController.createProfile);

// URL: /api/profile
router.put("/", authMiddleware, ProfileController.updateProfile);

// URL: /api/profile
router.delete("/", authMiddleware, ProfileController.deleteMyProfile);

// URL: /api/profile/check
router.get("/check", authMiddleware, ProfileController.checkProfile);

// URL: /api/profile/dashboard
router.get("/dashboard", authMiddleware, ProfileController.getDashboard);

// URL: /api/profile/calories
router.get("/calories", authMiddleware, ProfileController.getCalorieRecommendation);

// URL: /api/profile/macros
router.get("/macros", authMiddleware, ProfileController.getMacroSplit);

// URL: /api/profile/macros/meals
router.get("/macros/meals", authMiddleware, ProfileController.getMealWiseMacros);

// URL: /api/profile/macros/meals/suggestions
router.get("/macros/meals/suggestions", authMiddleware, ProfileController.getMealSuggestions);

// URL: /api/profile/workout
router.get("/workout", authMiddleware, ProfileController.getWorkoutPlan);

// URL: /api/profile/admin/profiles
router.get("/admin/profiles", authMiddleware, ProfileController.getAllProfiles);

// URL: /api/profile/admin/analytics
router.get("/admin/analytics", authMiddleware, ProfileController.getAdminAnalytics);

export default router;