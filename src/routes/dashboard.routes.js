// src/routes/dashboard.routes.js
import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import DashboardController from "../controllers/User/dashboard.controller.js";
import { getHealthInsights } from "../controllers/User/insight.controller.js"; 

const router = Router();
router.use(authMiddleware);

router.get("/workout/today",   DashboardController.getWorkout);
router.get("/nutrition/today", DashboardController.getNutrition);
router.get("/meals/today",     DashboardController.getMeals);
router.get("/health/snapshot", DashboardController.getHealth);
router.get("/progress/weekly", DashboardController.getWeekly);
router.get("/insights",        getHealthInsights);              
router.get("/streak",          DashboardController.getStreak);

export default router;