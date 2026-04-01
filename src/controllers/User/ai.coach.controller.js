// src/controllers/User/ai.coach.controller.js
import {
  buildAnalysisPrompt,
  streamGroqResponse,                          // ✅ FIX 1: was streamHFResponse (wrong name)
} from "../../services/ai.coach.service.js";

const pipeStream = async (groqRes, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for await (const chunk of groqRes.body) {
    const lines = chunk
      .toString()
      .split("\n")
      .filter((l) => l.startsWith("data:") && !l.includes("[DONE]"));

    for (const line of lines) {
      try {
        const json  = JSON.parse(line.slice(5));
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      } catch { /* skip malformed chunks */ }
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
};

// ── Shared error handler ──────────────────────────────────────────────────────
const handleError = (label, err, res) => {
  console.error(`[${label}]`, err.message);
  if (res.headersSent) return;

  if (err.status === 401)
    return res.status(502).json({ success: false, message: "Invalid Groq API key. Check GROQ_API_KEY in your .env" }); // ✅ FIX 2: updated message
  if (err.status === 429)
    return res.status(429).json({ success: false, message: "Groq rate limit hit. Wait a moment and retry." });         // ✅ FIX 2: updated message
  if (err.status === 503)
    return res.status(503).json({ success: false, message: "Groq service unavailable. Try again shortly." });

  return res.status(500).json({ success: false, message: err.message || "Internal server error." });
};

// ── POST /api/ai/analyze ──────────────────────────────────────────────────────
export const analyzeDay = async (req, res) => {
  const data = req.body;

  const required = [
    "goal", "weight", "target_calories", "calories",
    "protein", "protein_goal", "carbs", "carbs_goal",
    "fats", "fats_goal", "water", "sleep",
    "workout", "activity", "energy", "streak",
  ];

  for (const key of required) {
    if (data[key] === undefined || data[key] === "") {
      return res.status(400).json({ success: false, message: `Missing required field: ${key}` });
    }
  }

  try {
    const messages  = [{ role: "user", content: buildAnalysisPrompt(data) }];
    const groqRes   = await streamGroqResponse(messages);
    await pipeStream(groqRes, res);
  } catch (err) {
    handleError("analyzeDay", err, res);
  }
};

export const chat = async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "messages array is required and must not be empty.",
    });
  }

  try {
    const groqRes = await streamGroqResponse(messages.slice(-20));
    await pipeStream(groqRes, res);
  } catch (err) {
    handleError("chat", err, res);
  }
};