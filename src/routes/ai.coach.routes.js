// src/routes/aiCoach.routes.js

import { Router } from "express";
import { analyzeDay, chat } from "../controllers/User/ai.coach.controller.js";
import authenticate from "../middlewares/auth.middleware.js";
import { aiLimiter } from "../middlewares/ratelimiter.middleware.js";

const router = Router();

router.use(authenticate);

// POST /api/ai/analyze 
router.post("/analyze", aiLimiter, analyzeDay);

// POST /api/ai/chat 
router.post("/chat", aiLimiter, chat);

export default router;