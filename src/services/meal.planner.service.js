// src/services/mealPlanner.service.js
import fetch from "node-fetch";
import pool from "../config/db.config.js";

const GROQ_TOKEN    = process.env.GROQ_API_KEY;
const GROQ_MODEL    = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export function calculateCalories(profile) {
  const { age, gender, weight_kg, height_cm, activity_level, goal } = profile;

  let bmr = gender === "female"
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    : 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;

  const multipliers = {
    sedentary: 1.2, lightly_active: 1.375,
    moderately_active: 1.55, very_active: 1.725, extra_active: 1.9,
  };

  let tdee = Math.round(bmr * (multipliers[activity_level] || 1.55));
  if      (goal === "weight_loss") tdee = Math.round(tdee * 0.80);
  else if (goal === "muscle_gain") tdee = Math.round(tdee * 1.10);

  return {
    tdee,
    protein_g: Math.round((tdee * 0.30) / 4),
    carbs_g:   Math.round((tdee * 0.45) / 4),
    fats_g:    Math.round((tdee * 0.25) / 9),
    meals: {
      breakfast: Math.round(tdee * 0.25),
      lunch:     Math.round(tdee * 0.35),
      dinner:    Math.round(tdee * 0.30),
      snack:     Math.round(tdee * 0.10),
    },
  };
}

function buildSafetyRules(medicalConditions = [], goal) {
  const rules = [];
  const avoid = [];
  const conditions = Array.isArray(medicalConditions)
    ? medicalConditions.map(c => (typeof c === "string" ? c : c?.name ?? "").toLowerCase())
    : [];

  if (conditions.some(c => c.includes("diabetes") || c.includes("blood_sugar"))) {
    rules.push("User has diabetes: avoid sugar, sweets, white rice in large quantities, refined carbs.");
    avoid.push("sugar", "sweets", "jalebi", "soft drinks");
  }
  if (conditions.some(c => c.includes("hypertension") || c.includes("bp"))) {
    rules.push("User has high BP: avoid salty/fried foods. No pickles, papad, extra salt.");
    avoid.push("pickles", "papad", "fried snacks");
  }
  if (conditions.some(c => c.includes("cholesterol"))) {
    rules.push("User has high cholesterol: avoid fried foods, excess ghee.");
    avoid.push("fried foods", "excess ghee");
  }
  if (goal === "weight_loss") {
    rules.push("Goal is weight loss: avoid high-calorie fried foods, excess rice, maida.");
    avoid.push("samosa", "puri", "pakora");
  }
  if (goal === "muscle_gain") {
    rules.push("Goal is muscle gain: high protein essential at every meal.");
  }
  return { rules: rules.join("\n"), avoid };
}

function buildMealPlanPrompt(profile, calories, safety) {
  const { tdee, protein_g, carbs_g, fats_g, meals } = calories;
  const dietType = profile.diet_type || "non_veg";
  const isVeg    = dietType === "veg";
  const isEgg    = dietType === "eggetarian";

  return `You are a certified Nepali nutritionist. Generate a ONE-DAY meal plan.

USER: Age ${profile.age}, ${profile.gender}, ${profile.weight_kg}kg, ${profile.height_cm}cm
Goal: ${profile.goal} | Diet: ${dietType} | Activity: ${profile.activity_level}
Targets: ${tdee} kcal total | P:${protein_g}g C:${carbs_g}g F:${fats_g}g
Meal targets: Breakfast ${meals.breakfast} kcal | Lunch ${meals.lunch} kcal | Dinner ${meals.dinner} kcal | Snack ${meals.snack} kcal

FOOD RULES:
- Use REAL Nepali portion sizes. Examples:
  * Momo: minimum 6-8 pieces per serving (NOT 1 piece)
  * Dal Bhat: 1 thali = 1 cup rice + 1 katori dal + 1 small sabji
  * Roti: 1-3 pieces per serving
  * Chiura: 1-2 cups
  * Sel roti: 1-2 pieces
  * Rice: 1-2 cups cooked
- Include Nepali foods: dal bhat, roti, tarkari, aalu tarkari, saag, chiura, momo (steamed), dhido, gundruk, sel roti, chhurpi, gundruk soup, kwati, samay baji
${isVeg  ? "- STRICTLY VEGETARIAN - no meat, fish, eggs" : ""}
${isEgg  ? "- EGGETARIAN - eggs OK, no meat/fish" : ""}
${!isVeg && !isEgg ? "- Include chicken, eggs, fish for protein" : ""}

SAFETY: ${safety.rules || "None"}

Respond ONLY in valid JSON (no markdown):
{
  "total_calories": number,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fats_g": number,
  "meals": {
    "breakfast": {
      "calories": number,
      "items": [{"name":"string","portion":"string","calories":number,"protein_g":number,"carbs_g":number,"fats_g":number}]
    },
    "lunch":  {"calories":number,"items":[...]},
    "dinner": {"calories":number,"items":[...]},
    "snack":  {"calories":number,"items":[...]}
  },
  "tips": ["string","string","string"],
  "water_recommendation_liters": number
}`;
}

async function callGroq(prompt) {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_TOKEN}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000, temperature: 0.6, stream: false,
    }),
  });

  console.log("[MealPlanner] Groq status:", res.status);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body?.error?.message || `Groq error: ${res.status}`);
    error.status = res.status;
    throw error;
  }

  const data  = await res.json();
  const text  = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/gi, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    console.error("[MealPlanner] JSON parse failed:", text.slice(0, 300));
    throw new Error("AI returned invalid JSON. Try again.");
  }
}

export async function getUserProfileForPlanner(userId) {
  const { rows } = await pool.query(
    `SELECT p.age, p.gender, p.weight_kg, p.height_cm,
            p.activity_level, p.goal, p.medical_conditions, p.diet_type, u.name
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );
  if (!rows.length) throw new Error("Profile not found. Please complete your profile first.");
  return rows[0];
}

async function saveMealPlan(userId, plan, calorieData) {
  const today = new Date().toLocaleDateString("en-CA");
  const { rows } = await pool.query(
    `INSERT INTO ai_meal_plans (user_id, plan_date, plan_data, tdee, protein_g, carbs_g, fats_g, created_at)
     VALUES ($1, $2::date, $3::jsonb, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id, plan_date)
     DO UPDATE SET
       plan_data = EXCLUDED.plan_data, tdee = EXCLUDED.tdee,
       protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g,
       fats_g = EXCLUDED.fats_g, created_at = NOW()
     RETURNING *, plan_date::text AS plan_date_str`,
    [userId, today, JSON.stringify(plan),
     calorieData.tdee, calorieData.protein_g, calorieData.carbs_g, calorieData.fats_g]
  );
  console.log("[MealPlanner] Saved for:", rows[0].plan_date_str);
  return rows[0];
}

export async function generateMealPlan(userId) {
  const profile     = await getUserProfileForPlanner(userId);
  const calorieData = calculateCalories(profile);
  const safety      = buildSafetyRules(profile.medical_conditions, profile.goal);
  const prompt      = buildMealPlanPrompt(profile, calorieData, safety);
  const plan        = await callGroq(prompt);
  const saved       = await saveMealPlan(userId, plan, calorieData);

  return {
    profile:      { name: profile.name, goal: profile.goal, diet_type: profile.diet_type },
    calories:     calorieData,
    safety_rules: safety.avoid,
    plan,
    saved_at:  saved.created_at,
    plan_date: saved.plan_date_str ?? saved.plan_date,
  };
}

export async function getTodaysPlan(userId) {
  const today = new Date().toLocaleDateString("en-CA");
  const { rows } = await pool.query(
    `SELECT *, plan_date::text AS plan_date_str
     FROM ai_meal_plans WHERE user_id = $1 AND plan_date = $2::date`,
    [userId, today]
  );
  if (!rows.length) return null;

  const row         = rows[0];
  const profile     = await getUserProfileForPlanner(userId);
  const calorieData = calculateCalories(profile);
  const safety      = buildSafetyRules(profile.medical_conditions, profile.goal);

  return {
    profile:      { name: profile.name, goal: profile.goal, diet_type: profile.diet_type },
    calories:     calorieData,
    safety_rules: safety.avoid,
    plan:      row.plan_data,
    saved_at:  row.created_at,
    plan_date: row.plan_date_str ?? row.plan_date,
  };
}

export async function getPlanHistory(userId, limit = 7) {
  const { rows } = await pool.query(
    `SELECT plan_date::text AS plan_date, tdee, protein_g, carbs_g, fats_g, created_at
     FROM ai_meal_plans WHERE user_id = $1
     ORDER BY plan_date DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}