// src/routes/admin.routes.js
import { Router } from "express";
import authMiddleware  from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";

import AdminDashboardController    from "../controllers/Admin/admin.dashboard.controller.js";
import AdminUsersController        from "../controllers/Admin/admin.user.controller.js";
import AdminMealsController        from "../controllers/Admin/admin.meal.controller.js";
import AdminExercisesController    from "../controllers/Admin/admin.exercise.controller.js";
import AdminPlansController        from "../controllers/Admin/admin.plan.controller.js";
import AdminLogsController         from "../controllers/Admin/admin.log.controller.js";
import AdminAnalyticsController    from "../controllers/Admin/admin.analytic.controller.js";
import AdminNotificationsController from "../controllers/Admin/admin.notification.controller.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/dashboard", AdminDashboardController.getStats);

router.get("/users",                    AdminUsersController.getAllUsers);
router.get("/users/:id",                AdminUsersController.getUserById);
router.patch("/users/:id/ban",          AdminUsersController.banUser);
router.patch("/users/:id/activate",     AdminUsersController.activateUser);
router.patch("/users/:id/verify",       AdminUsersController.verifyUser);
router.patch("/users/:id/reset-password", AdminUsersController.resetPassword);
router.delete("/users/:id",             AdminUsersController.deleteUser);

router.get("/meals",          AdminMealsController.getAllMeals);
router.get("/meals/:id",      AdminMealsController.getMealById);
router.post("/meals",         AdminMealsController.createMeal);
router.put("/meals/:id",      AdminMealsController.updateMeal);
router.delete("/meals/:id",   AdminMealsController.deleteMeal);

router.get("/exercises",         AdminExercisesController.getAllExercises);
router.get("/exercises/:id",     AdminExercisesController.getExerciseById);
router.post("/exercises",        AdminExercisesController.createExercise);
router.put("/exercises/:id",     AdminExercisesController.updateExercise);
router.delete("/exercises/:id",  AdminExercisesController.deleteExercise);

router.get("/plans",                   AdminPlansController.getAllPlans);
router.get("/plans/:id",               AdminPlansController.getPlanById);
router.patch("/plans/:id/deactivate",  AdminPlansController.deactivatePlan);
router.delete("/plans/:id",            AdminPlansController.deletePlan);

router.get("/logs/workout-logs",           AdminLogsController.getWorkoutLogs);
router.delete("/logs/workout-logs/:id",    AdminLogsController.deleteWorkoutLog);
router.get("/logs/meal-logs",              AdminLogsController.getMealLogs);
router.delete("/logs/meal-logs/:id",       AdminLogsController.deleteMealLog);
router.get("/logs/progress-logs",          AdminLogsController.getProgressLogs);
router.get("/logs/admin-logs",             AdminLogsController.getAdminLogs);

router.get("/analytics/overview",    AdminAnalyticsController.getOverview);
router.get("/analytics/users",       AdminAnalyticsController.getUserStats);
router.get("/analytics/workouts",    AdminAnalyticsController.getWorkoutStats);
router.get("/analytics/meals",       AdminAnalyticsController.getMealStats);
router.get("/analytics/retention",   AdminAnalyticsController.getRetentionStats);
router.get("/analytics/at-risk",     AdminAnalyticsController.getAtRiskUsers);
router.get("/analytics/top-users",   AdminAnalyticsController.getTopActiveUsers);

router.get("/notifications",              AdminNotificationsController.getNotifications);
router.post("/notifications/send",        AdminNotificationsController.sendNotification);
router.post("/notifications/broadcast",   AdminNotificationsController.broadcastNotification);
router.delete("/notifications/:id",       AdminNotificationsController.deleteNotification);

export default router;