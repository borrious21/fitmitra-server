// src/routes/mealPlanner.routes.js
import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/ratelimiter.middleware.js";
import { generate, getToday, getHistory } from "../controllers/User/meal.planner.controller.js";

const router = Router();

router.use(authenticate);

// POST /api/meal-planner/generate  
router.post("/generate", aiLimiter, generate);

// GET  /api/meal-planner/today     
router.get("/today",    getToday);

// GET  /api/meal-planner/history   
router.get("/history",  getHistory);

export default router;
