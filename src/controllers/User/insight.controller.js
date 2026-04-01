import { generateHealthInsights } from "../../services/health.service.js";

export const getHealthInsights = async (req, res) => {
  try {
    const insights = await generateHealthInsights(req.user.id);
    return res.status(200).json({ success: true, data: insights });
  } catch (err) {
    console.error("[healthInsights]", err.message);
    
    return res.status(200).json({ success: true, data: [] });
  }
};