import { Router } from "express";
import ProgressController from "../controllers/User/progress.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// URL: /api/progress/log
router.post("/log", authMiddleware, ProgressController.logProgress);

// URL: /api/progress/log
router.get("/log", authMiddleware, ProgressController.getProgressHistory);

// URL: /api/progress/trends
router.get("/trends", authMiddleware, ProgressController.getProgressTrends);

// URL: /api/progress/latest
router.get("/latest", authMiddleware, ProgressController.getLatestProgress);

// URL: /api/progress/log/:id
router.delete("/log/:id", authMiddleware, ProgressController.deleteProgress);

export default router;
