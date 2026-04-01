// src/routes/plan.routes.js

import { Router } from "express";
import PlanController from "../controllers/User/plan.controller.js";
import protect from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

const validateNumericId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid plan ID — must be a positive integer." });
  }
  req.params.id = id;
  next();
};

// POST   /api/plans/generate
router.post("/generate", PlanController.generatePlan);

// GET    /api/plans/active
router.get("/active", PlanController.getActivePlan);

// GET    /api/plans/history
router.get("/history", PlanController.getPlanHistory);

// GET    /api/plans/stats
router.get("/stats", PlanController.getPlanStats);

router.get("/gamification", PlanController.getGamification);

// POST   /api/plans/missed-workout    
router.post("/missed-workout", PlanController.missedWorkout);

// POST   /api/plans/adaptive-difficulty
router.post("/adaptive-difficulty", PlanController.adaptiveDifficulty);

// POST   /api/plans/insights
router.post("/insights", PlanController.getInsights);

// POST   /api/plans/calorie-adjustment
router.post("/calorie-adjustment", PlanController.getCalorieAdjustment);

// POST   /api/plans/progression
router.post("/progression", PlanController.getProgression);

// POST   /api/plans/progress-metrics
router.post("/progress-metrics", PlanController.getProgressMetrics);

// GET    /api/plans/:id
router.get("/:id", validateNumericId, PlanController.getPlanById);

// PATCH  /api/plans/:id/activate
router.patch("/:id/activate", validateNumericId, PlanController.activatePlan);

// PATCH  /api/plans/:id/complete
router.patch("/:id/complete", validateNumericId, PlanController.completePlan);

// DELETE /api/plans/:id
router.delete("/:id", validateNumericId, PlanController.deletePlan);

export default router;