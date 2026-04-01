
import {
  generateMealPlan,
  getTodaysPlan,
  getPlanHistory,
} from "../../services/meal.planner.service.js";



export const generate = async (req, res) => {
  try {
    const result = await generateMealPlan(req.user.id);
    return res.status(200).json({ success: true, message: "Meal plan generated", data: result });
  } catch (err) {
    console.error("[mealPlanner:generate]", err.message);

    if (err.message.includes("Profile not found")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.status === 401) {
      return res.status(502).json({ success: false, message: "Invalid Groq API key." });
    }
    if (err.status === 429) {
      return res.status(429).json({ success: false, message: "AI rate limit hit. Wait a moment." });
    }
    return res.status(500).json({ success: false, message: err.message || "Failed to generate meal plan." });
  }
};



export const getToday = async (req, res) => {
  try {
    const result = await getTodaysPlan(req.user.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No meal plan for today. Generate one first.",
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[mealPlanner:getToday]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};



export const getHistory = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 7, 30);
    const result = await getPlanHistory(req.user.id, limit);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[mealPlanner:getHistory]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};