// src/domain/nutrition.rules.js

import { ACTIVITY_MULTIPLIERS, MEAL_RATIOS } from "./profile.enum.js";

function calcBMR({ weight_kg, height_cm, age, gender }) {
  if (!weight_kg || !height_cm || !age) return null;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

function calcTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.375));
}

function goalAdjustedCalories(tdee, goal) {
  const adjustments = {
    weight_loss:      -500,
    muscle_gain:      +300,
    maintain_fitness:    0,
    endurance:        +200,
    wellness:            0,
  };
  return tdee + (adjustments[goal] ?? 0);
}

export function calculateRecommendedCalories(profile) {
  const bmr = calcBMR(profile);
  if (!bmr) return null;

  const tdee     = calcTDEE(bmr, profile.activity_level);
  const calories = goalAdjustedCalories(tdee, profile.goal);

  return {
    bmr:      Math.round(bmr),
    tdee,
    calories,
    goal:     profile.goal,
    activity: profile.activity_level,
  };
}

const MACRO_SPLITS = {
  weight_loss:      { protein: 0.35, carbs: 0.35, fats: 0.30 },
  muscle_gain:      { protein: 0.35, carbs: 0.45, fats: 0.20 },
  endurance:        { protein: 0.20, carbs: 0.55, fats: 0.25 },
  maintain_fitness: { protein: 0.25, carbs: 0.50, fats: 0.25 },
  wellness:         { protein: 0.25, carbs: 0.50, fats: 0.25 },
};

export function calculateMacroSplit(profile) {
  const calData = calculateRecommendedCalories(profile);
  if (!calData) return null;

  const { calories } = calData;
  const split = MACRO_SPLITS[profile.goal] ?? MACRO_SPLITS.maintain_fitness;

  return {
    calories,
    protein_g: Math.round((calories * split.protein) / 4),
    carbs_g:   Math.round((calories * split.carbs)   / 4),
    fats_g:    Math.round((calories * split.fats)    / 9),
    split_pct: {
      protein: Math.round(split.protein * 100),
      carbs:   Math.round(split.carbs   * 100),
      fats:    Math.round(split.fats    * 100),
    },
  };
}

export function calculateMealWiseMacros(profile) {
  const macros = calculateMacroSplit(profile);
  if (!macros) return null;

  const meals = {};
  for (const [meal, ratio] of Object.entries(MEAL_RATIOS)) {
    meals[meal] = {
      calories:  Math.round(macros.calories  * ratio),
      protein_g: Math.round(macros.protein_g * ratio),
      carbs_g:   Math.round(macros.carbs_g   * ratio),
      fats_g:    Math.round(macros.fats_g    * ratio),
    };
  }

  return { daily: macros, meals };
}

export function generateMealSuggestions(profile) {
  if (!profile) return null;

  const goal       = profile.goal ?? "maintain_fitness";
  const dietType   = normalizeDietType(profile.diet_type);
  const conditions = extractConditions(profile.medical_conditions);
  const mealConfig = buildMealConfig(goal, dietType, conditions);

  return {
    meta: {
      goal,
      diet_type: dietType,
      medical_conditions: conditions,
      focus_areas: mealConfig.focusAreas,
      note: "Personalized meal suggestions based on your profile",
    },
    meals:                   generateMeals(mealConfig),
    nutritional_guidelines:  getNutritionalGuidelines(goal, conditions),
    tips:                    getHealthTips(conditions),
    disclaimer:
      "These are general suggestions. Consult a registered dietitian for personalized meal plans and portion sizes.",
  };
}

function normalizeDietType(diet) {
  if (diet === "eggetarian") return "eggetarian";
  if (diet === "non_veg")    return "non_veg";
  return "veg";
}

function extractConditions(medical_conditions = {}) {
  return Object.keys(medical_conditions)
    .filter((k) => medical_conditions[k] === true)
    .map((c) => c.toLowerCase());
}

function buildMealConfig(goal, dietType, conditions) {
  const config = {
    proteinFocus:     false,
    lowGI:            false,
    lowSodium:        false,
    heartHealthy:     false,
    antiInflammatory: false,
    dietType,
    calorieLevel: "moderate",
    focusAreas:   [],
  };

  switch (goal) {
    case "weight_loss":
      config.calorieLevel = "deficit";
      config.proteinFocus = true;
      config.focusAreas.push("High protein, controlled portions");
      break;
    case "muscle_gain":
      config.calorieLevel = "surplus";
      config.proteinFocus = true;
      config.focusAreas.push("High protein, adequate carbs for energy");
      break;
    default:
      config.focusAreas.push("Balanced nutrition");
  }

  if (conditions.includes("diabetes"))     { config.lowGI = true;            config.focusAreas.push("Low glycemic index foods, high fiber"); }
  if (conditions.includes("hypertension")) { config.lowSodium = true;         config.focusAreas.push("Low sodium, potassium-rich foods"); }
  if (conditions.includes("heart_disease")){ config.heartHealthy = true;      config.focusAreas.push("Heart-healthy fats, lean proteins"); }
  if (conditions.includes("pcos"))         { config.lowGI = true; config.antiInflammatory = true; config.focusAreas.push("Anti-inflammatory, hormone-friendly foods"); }

  return config;
}

function generateMeals(config) {
  return {
    breakfast: selectMeals(getBreakfastOptions(config), 2),
    lunch:     selectMeals(getLunchOptions(config),     2),
    dinner:    selectMeals(getDinnerOptions(config),    2),
    snacks:    selectMeals(getSnackOptions(config),     3),
  };
}

function meal(name, tags, calories, protein, carbs, fats, why) {
  return { name, tags, nutrition: { calories, protein, carbs, fats }, why };
}

function selectMeals(options, count) {
  return options.slice(0, Math.min(count, options.length));
}

function getBreakfastOptions(config) {
  const options = [];

  if (config.proteinFocus) {
    options.push(
      meal("Moong dal cheela with vegetables",   ["veg", "high-protein", "nepali"], 280, 16, 35,  8, "High protein from lentils, balanced with vegetables"),
      meal("Greek yogurt with nuts and berries",  ["veg", "high-protein"],           320, 20, 28, 14, "Rich in protein and probiotics for gut health")
    );
  }

  if (config.lowGI) {
    options.push(
      meal("Steel-cut oats with cinnamon and walnuts", ["veg", "low-gi"],          300, 10, 42, 12, "Slow-release carbs for stable blood sugar"),
      meal("Chiura with yogurt and flax seeds",         ["veg", "low-gi", "nepali"], 260, 12, 38,  8, "Traditional Nepali low-GI breakfast")
    );
  }

  options.push(
    meal("Whole wheat toast with peanut butter and banana", ["veg"], 340, 12, 48, 14, "Balanced energy for the morning")
  );

  if (config.dietType !== "veg") {
    options.push(
      meal("Scrambled eggs with whole wheat roti", ["egg", "high-protein"], 320, 22, 30, 12, "Complete protein keeps you full longer")
    );
  }

  return options;
}

function getLunchOptions(config) {
  const options = [
    meal("Dal bhat with seasonal vegetables", ["veg", "nepali", "balanced"], 440, 15, 68, 12, "Traditional balanced Nepali meal"),
    meal("Vegetable pulao with raita",         ["veg"],                       410, 12, 62, 14, "Nutritious one-pot meal"),
  ];

  if (config.proteinFocus) {
    options.push(meal("Rajma with brown rice", ["veg", "high-protein"], 420, 18, 62, 10, "Plant-based complete protein"));
  }
  if (config.dietType === "non_veg") {
    options.push(meal("Grilled chicken with brown rice", ["non_veg", "high-protein"], 480, 35, 52, 12, "Lean protein for muscle recovery"));
  }

  return options;
}

function getDinnerOptions(config) {
  const options = [
    meal("Vegetable khichdi with yogurt",            ["veg", "light", "nepali"], 320, 12, 52,  8, "Easy to digest evening meal"),
    meal("Roti with mixed vegetable curry and dal",  ["veg"],                    360, 14, 56, 10, "Light yet satisfying dinner"),
  ];

  if (config.proteinFocus) {
    options.push(meal("Tofu stir-fry with vegetables", ["veg", "high-protein"], 380, 20, 44, 14, "Plant protein for overnight recovery"));
  }

  return options;
}

function getSnackOptions(config) {
  const options = [
    meal("Roasted peanuts",      ["veg", "nepali"], 170, 7, 6,  14, "Quick energy with healthy fats"),
    meal("Fresh seasonal fruit", ["veg"],            80,  1, 20,  0, "Natural vitamins and fiber"),
  ];

  if (config.proteinFocus) {
    options.push(meal("Roasted chickpeas", ["veg", "high-protein"], 140, 8, 22, 3, "Crunchy protein-packed snack"));
  }

  return options;
}

function getNutritionalGuidelines(goal, conditions) {
  const rec = { daily_targets: {}, recommendations: [] };

  if (goal === "muscle_gain") {
    rec.daily_targets = { calories: "2200–2800", protein: "120–160g" };
    rec.recommendations.push("Eat in a controlled calorie surplus");
  } else if (goal === "weight_loss") {
    rec.daily_targets = { calories: "1500–1800", protein: "90–120g" };
    rec.recommendations.push("Maintain a moderate calorie deficit");
  } else {
    rec.daily_targets = { calories: "1800–2200" };
    rec.recommendations.push("Maintain balanced nutrition");
  }

  if (conditions.includes("diabetes")) {
    rec.recommendations.push("Prefer low GI, high-fiber foods");
  }

  return rec;
}

function getHealthTips(conditions) {
  const tips = ["Drink enough water daily", "Eat mindfully and avoid overeating"];
  if (conditions.includes("diabetes")) tips.push("Pair carbs with protein to reduce glucose spikes");
  return tips;
}