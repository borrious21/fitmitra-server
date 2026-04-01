// src/services/ai.coach.service.js
import fetch from "node-fetch";

const GROQ_TOKEN    = process.env.GROQ_API_KEY;
const GROQ_MODEL    = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_TOKEN) {
  console.error("❌ GROQ_API_KEY is not set in .env");
  console.error("   Get a free key at: https://console.groq.com");
}

console.log("[Groq] model:", GROQ_MODEL);

const SYSTEM_PROMPT = `You are Fitmitra AI Coach — a smart, motivating fitness coach.
Your job is to analyze the user's daily fitness data and give short, actionable insights.

INSTRUCTIONS:
1. Analyze the data and detect:
   - Calorie surplus or deficit
   - Protein deficiency
   - Hydration level
   - Recovery status (sleep + energy)
   - Workout consistency

2. For daily analysis, respond ONLY in this exact format:
🔥 Insight: [most critical finding with specific numbers]
👉 Action: [one concrete thing to do today]
💬 Coach: [one motivational line referencing their streak]

3. Keep total response under 60 words. Be specific, not generic. Coach tone — friendly but firm.
4. For follow-up questions, answer as a knowledgeable fitness coach — concise and direct.`;

export const buildAnalysisPrompt = (data) => `
My daily fitness data:
- Goal: ${data.goal}
- Weight: ${data.weight} kg
- Target Calories: ${data.target_calories} kcal | Consumed: ${data.calories} kcal
- Protein: ${data.protein}/${data.protein_goal}g | Carbs: ${data.carbs}/${data.carbs_goal}g | Fats: ${data.fats}/${data.fats_goal}g
- Water: ${data.water}L | Sleep: ${data.sleep}hrs
- Workout: ${data.workout} | Activity: ${data.activity}
- Energy: ${data.energy}/10 | Streak: ${data.streak} days

Give me my daily coaching insight.
`.trim();

// ✅ FIX 4: renamed from streamHFResponse → streamGroqResponse to match controller import
export const streamGroqResponse = async (messages) => {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_TOKEN}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens:  300,
      temperature: 0.7,
      stream:      true,
    }),
  });

  console.log("[Groq] response status:", res.status);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[Groq] error body:", JSON.stringify(body));
    const error = new Error(body?.error?.message || body?.error || `Groq API error: ${res.status}`);
    error.status = res.status;
    throw error;
  }

  return res;
};