// src/routes/smartRecommendation.routes.js
import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/ratelimiter.middleware.js";
import { getRecommendations, applyRecommendations } from "../controllers/User/smart.recommendation.controller.js";

const router = Router();

router.use(authenticate);

// GET  /api/recommendations         
router.get("/",       aiLimiter, getRecommendations);

// POST /api/recommendations/apply   
router.post("/apply", aiLimiter, applyRecommendations);

export default router;
