// src/routes/meal.route.js
import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";

import {
  logMeal,
  getMealLogs,
  getMealLogById,
  getMealLogsByDate,
  updateMealLog,
  deleteMealLog,
  deleteMealLogsByDate,
  getMealSummaryDaily,
  getMealSummaryWeekly,
} from "../controllers/User/meal.controller.js";

import MealModel from "../models/meal.model.js";

const router = Router();
router.use(authMiddleware);

router.get("/summary/daily",  getMealSummaryDaily);
router.get("/summary/weekly", getMealSummaryWeekly);
router.get("/daily",          getMealSummaryDaily);
router.get("/weekly",         getMealSummaryWeekly);

router.get("/browse", async (req, res) => {
  try {
    const {
      search    = "",
      diet_type = "",
      tag       = "",
      limit     = 20,
      offset    = 0,
    } = req.query;

    const result = await MealModel.findAll({
      dietType: diet_type || undefined,
      tag:      tag       || undefined,
      limit:    Math.min(Number(limit), 100),
      offset:   Number(offset),
      
    });

    let meals = result.meals;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      meals = meals.filter(m => m.name.toLowerCase().includes(q));
    }

    return res.status(200).json({
      success: true,
      data: {
        meals,
        total:  search.trim() ? meals.length : result.total,
        limit:  result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    console.error("[meals/browse]", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch meals" });
  }
});

router.get("/date/:date",    getMealLogsByDate);
router.delete("/date/:date", deleteMealLogsByDate);
router.post("/log",          logMeal);
router.get("/",              getMealLogs);
router.get("/:id",           getMealLogById);
router.patch("/:id",         updateMealLog);
router.delete("/:id",        deleteMealLog);

export default router;