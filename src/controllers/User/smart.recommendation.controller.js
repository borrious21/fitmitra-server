// src/controllers/User/smartRecommendation.controller.js
import { getSmartRecommendations } from "../../services/smart.recommendation.service.js";

// GET /api/recommendations
export const getRecommendations = async (req, res) => {
  try {
    const result = await getSmartRecommendations(req.user.id, false);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[recommendations:get]", err.message);
    if (err.message.includes("Profile not found")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || "Internal server error." });
  }
};

// POST /api/recommendations/apply
export const applyRecommendations = async (req, res) => {
  try {
    const result = await getSmartRecommendations(req.user.id, true);
    return res.status(200).json({
      success: true,
      message: result.adjustments.calorie_delta !== 0
        ? `Calorie target updated to ${result.adjustments.applied_calorie_target} kcal`
        : "Analysis complete — no adjustments needed",
      data: result,
    });
  } catch (err) {
    console.error("[recommendations:apply]", err.message);
    return res.status(500).json({ success: false, message: err.message || "Internal server error." });
  }
};