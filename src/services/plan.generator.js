// src/services/plan.generator.js
const WARMUP = [
  { name: "Jump Rope / Light Jog",    duration_min: 5, est_kcal: 50, type: "warmup" },
  { name: "Arm Circles & Leg Swings", duration_min: 3, est_kcal: 20, type: "warmup" },
  { name: "Dynamic Stretching",       duration_min: 2, est_kcal: 15, type: "warmup" },
];

const COOLDOWN = [
  { name: "Static Stretching", duration_min: 5, est_kcal: 20, type: "cooldown" },
];

const EXERCISE_POOL = {
  "Full Body": [
    { name: "Goblet Squat",   muscles: ["Quads","Glutes","Core"],       sets: 3, reps: 12, weight_kg: 0,  est_kcal: 180 },
    { name: "Push-Up",        muscles: ["Chest","Triceps","Shoulders"], sets: 3, reps: 12, weight_kg: 0,  est_kcal: 100 },
    { name: "Dumbbell Row",   muscles: ["Back","Biceps"],               sets: 3, reps: 12, weight_kg: 10, est_kcal: 120 },
    { name: "Plank",          muscles: ["Core"],                        sets: 3, reps: null, duration_sec: 30, weight_kg: 0, est_kcal: 60 },
  ],
  "Full Body B": [
    { name: "Romanian Deadlift", muscles: ["Hamstrings","Glutes","Lower Back"], sets: 3, reps: 10, weight_kg: 20, est_kcal: 200 },
    { name: "Pike Push-Up",      muscles: ["Shoulders","Triceps"],              sets: 3, reps: 10, weight_kg: 0,  est_kcal: 90  },
    { name: "Inverted Row",      muscles: ["Back","Biceps"],                    sets: 3, reps: 10, weight_kg: 0,  est_kcal: 110 },
    { name: "Dead Bug",          muscles: ["Core"],                             sets: 3, reps: 10, weight_kg: 0,  est_kcal: 50  },
  ],

  Push: [
    { name: "Bench Press",            muscles: ["Chest","Triceps","Shoulders"], sets: 4, reps: 8,  weight_kg: 40, est_kcal: 220 },
    { name: "Overhead Press",         muscles: ["Shoulders","Triceps"],         sets: 3, reps: 10, weight_kg: 25, est_kcal: 160 },
    { name: "Incline Dumbbell Press", muscles: ["Upper Chest","Shoulders"],     sets: 3, reps: 10, weight_kg: 15, est_kcal: 150 },
    { name: "Tricep Dips",            muscles: ["Triceps"],                     sets: 3, reps: 12, weight_kg: 0,  est_kcal: 100 },
  ],
  "Push B": [
    { name: "Dumbbell Fly",    muscles: ["Chest"],                sets: 3, reps: 12, weight_kg: 10, est_kcal: 130 },
    { name: "Arnold Press",    muscles: ["Shoulders"],            sets: 3, reps: 10, weight_kg: 12, est_kcal: 140 },
    { name: "Decline Push-Up", muscles: ["Lower Chest","Triceps"],sets: 3, reps: 12, weight_kg: 0,  est_kcal: 100 },
    { name: "Skull Crushers",  muscles: ["Triceps"],              sets: 3, reps: 10, weight_kg: 15, est_kcal: 90  },
  ],

  Pull: [
    { name: "Pull-Up",     muscles: ["Back","Biceps"],              sets: 4, reps: 6,  weight_kg: 0,  est_kcal: 200 },
    { name: "Barbell Row", muscles: ["Back","Rear Delts"],          sets: 3, reps: 8,  weight_kg: 40, est_kcal: 190 },
    { name: "Face Pull",   muscles: ["Rear Delts","Rotator Cuff"],  sets: 3, reps: 15, weight_kg: 10, est_kcal: 90  },
    { name: "Hammer Curl", muscles: ["Biceps","Forearms"],          sets: 3, reps: 12, weight_kg: 10, est_kcal: 80  },
  ],
  "Pull B": [
    { name: "Lat Pulldown",       muscles: ["Lats","Biceps"],     sets: 4, reps: 10, weight_kg: 40, est_kcal: 180 },
    { name: "Seated Cable Row",   muscles: ["Mid Back","Biceps"], sets: 3, reps: 10, weight_kg: 35, est_kcal: 170 },
    { name: "Reverse Fly",        muscles: ["Rear Delts"],        sets: 3, reps: 15, weight_kg: 5,  est_kcal: 70  },
    { name: "Concentration Curl", muscles: ["Biceps"],            sets: 3, reps: 12, weight_kg: 8,  est_kcal: 75  },
  ],

  Legs: [
    { name: "Back Squat",            muscles: ["Quads","Glutes","Hamstrings"], sets: 3, reps: 8,  weight_kg: 60, est_kcal: 230 },
    { name: "Bulgarian Split Squat", muscles: ["Quads","Glutes"],              sets: 3, reps: 10, weight_kg: 20, est_kcal: 200 },
    { name: "Leg Press",             muscles: ["Quads","Glutes"],              sets: 3, reps: 12, weight_kg: 80, est_kcal: 180 },
    { name: "Standing Calf Raise",   muscles: ["Calves"],                      sets: 3, reps: 15, weight_kg: 0,  est_kcal: 70  },
  ],
  "Legs B": [
    { name: "Romanian Deadlift", muscles: ["Hamstrings","Glutes"],   sets: 3, reps: 8,  weight_kg: 50, est_kcal: 230 },
    { name: "Sumo Squat",        muscles: ["Inner Thighs","Glutes"], sets: 3, reps: 12, weight_kg: 20, est_kcal: 180 },
    { name: "Walking Lunges",    muscles: ["Quads","Glutes"],        sets: 3, reps: 12, weight_kg: 10, est_kcal: 190 },
    { name: "Seated Calf Raise", muscles: ["Calves"],                sets: 3, reps: 15, weight_kg: 20, est_kcal: 70  },
  ],

  Core: [
    { name: "Cable Crunch",      muscles: ["Abs"],               sets: 3, reps: 15, weight_kg: 15, est_kcal: 80  },
    { name: "Hanging Leg Raise", muscles: ["Abs","Hip Flexors"], sets: 3, reps: 12, weight_kg: 0,  est_kcal: 110 },
    { name: "Ab Wheel Rollout",  muscles: ["Abs","Core"],        sets: 3, reps: 10, weight_kg: 0,  est_kcal: 120 },
    { name: "Russian Twist",     muscles: ["Obliques"],          sets: 3, reps: 20, weight_kg: 8,  est_kcal: 90  },
    { name: "Weighted Plank",    muscles: ["Core"],              sets: 3, reps: null, duration_sec: 45, weight_kg: 10, est_kcal: 80 },
  ],
  "Core B": [
    { name: "Bicycle Crunch",        muscles: ["Abs","Obliques"], sets: 3, reps: 20, weight_kg: 0, est_kcal: 80  },
    { name: "V-Up",                  muscles: ["Abs"],            sets: 3, reps: 15, weight_kg: 0, est_kcal: 85  },
    { name: "Side Plank",            muscles: ["Obliques"],       sets: 3, reps: null, duration_sec: 30, weight_kg: 0, est_kcal: 55 },
    { name: "Hollow Body Hold",      muscles: ["Core","Abs"],     sets: 3, reps: null, duration_sec: 30, weight_kg: 0, est_kcal: 60 },
    { name: "Dragon Flag Negatives", muscles: ["Abs","Core"],     sets: 3, reps: 5,  weight_kg: 0, est_kcal: 90  },
  ],

  HIIT: [
    { name: "Burpees",          muscles: ["Full Body"],               sets: 4, reps: 10, weight_kg: 0, est_kcal: 160 },
    { name: "Jump Squats",      muscles: ["Quads","Glutes"],          sets: 4, reps: 12, weight_kg: 0, est_kcal: 140 },
    { name: "Mountain Climbers",muscles: ["Core","Shoulders"],        sets: 4, reps: null, duration_sec: 30, weight_kg: 0, est_kcal: 120 },
    { name: "Box Jumps",        muscles: ["Quads","Glutes","Calves"], sets: 3, reps: 10, weight_kg: 0, est_kcal: 130 },
  ],

  LISS: [
    { name: "Brisk Walk",    muscles: ["Full Body"],      sets: 1, duration_min: 30, reps: null, weight_kg: 0, est_kcal: 150 },
    { name: "Light Cycling", muscles: ["Quads","Calves"], sets: 1, duration_min: 25, reps: null, weight_kg: 0, est_kcal: 130 },
  ],
  "LISS B": [
    { name: "Easy Swim",  muscles: ["Full Body"], sets: 1, duration_min: 25, reps: null, weight_kg: 0, est_kcal: 170 },
    { name: "Elliptical", muscles: ["Full Body"], sets: 1, duration_min: 30, reps: null, weight_kg: 0, est_kcal: 160 },
  ],

  Cardio: [
    { name: "Treadmill Run", muscles: ["Full Body"],      sets: 1, duration_min: 30, reps: null, weight_kg: 0, est_kcal: 300 },
  ],
  "Cardio B": [
    { name: "Cycling", muscles: ["Quads","Calves"], sets: 1, duration_min: 30, reps: null, weight_kg: 0, est_kcal: 260 },
  ],

  Stretching: [
    { name: "Full Body Stretch Routine", muscles: ["Full Body"], sets: 1, duration_min: 20, reps: null, weight_kg: 0, est_kcal: 80 },
  ],
};

const SPLITS = {
  beginner:     ["Full Body", "Cardio",  "Stretching"],
  intermediate: ["Push", "Pull", "Legs", "Core", "LISS"],
  advanced:     ["Push", "Pull", "Legs", "HIIT", "Core", "LISS"],
};

export const MISSED_WORKOUT_RECOVERY = {
  Push:        "3×10 push-ups + 3×10 dumbbell press at home",
  Pull:        "3×10 resistance band rows + 3×10 bicep curls",
  Legs:        "3×15 bodyweight squats + 3×12 reverse lunges",
  "Full Body": "20-min full-body bodyweight circuit",
  HIIT:        "15-min brisk walk — keep moving, don't skip rest",
  LISS:        "10-min walk around the block — any movement counts",
  Core:        "3×30s plank + 3×20 bicycle crunches",
  Cardio:      "20-min easy walk",
  Stretching:  "10-min bedtime stretch routine",
};

const MEAL_POOL = {
  veg: {
    breakfast: [
      "Oats with banana & chia seeds",
      "Greek yogurt with mixed berries",
      "Avocado toast on whole grain bread",
      "Moong dal chilla with mint chutney",
      "Smoothie bowl (spinach, banana, protein powder)",
      "Besan cheela with curd",
      "Poha with peanuts",
      "Upma with vegetables",
    ],
    lunch: [
      "Dal Bhat with mixed veg sabji",
      "Paneer tikka wrap with salad",
      "Rajma chawal",
      "Chana masala with brown rice",
      "Palak tofu with roti",
      "Quinoa vegetable stir-fry",
      "Lentil soup with whole wheat bread",
      "Veg biryani with raita",
    ],
    dinner: [
      "Vegetable soup with multigrain roti",
      "Tofu stir-fry with brown rice",
      "Sautéed vegetables with dal",
      "Mixed vegetable curry with roti",
      "Miso soup with edamame",
      "Baked sweet potato with black beans",
      "Grilled paneer salad",
      "Lentil dhal with naan",
    ],
    snack: [
      "Handful of almonds & walnuts",
      "Apple with peanut butter",
      "Roasted chickpeas",
      "Protein shake",
      "Hummus with veggie sticks",
      "Cottage cheese with fruit",
    ],
  },
  non_veg: {
    breakfast: [
      "Scrambled eggs with whole wheat toast",
      "Egg white omelette with vegetables",
      "Greek yogurt with granola",
      "Chicken sausage with oats",
      "Boiled eggs with avocado",
      "Smoked salmon on rye bread",
      "Turkey & egg wrap",
      "Protein smoothie with milk",
    ],
    lunch: [
      "Grilled chicken breast with brown rice",
      "Tuna salad with whole grain crackers",
      "Chicken wrap with veggies",
      "Fish curry with rice",
      "Turkey & quinoa bowl",
      "Egg fried rice (brown rice)",
      "Chicken + vegetable stir-fry",
      "Grilled fish with steamed broccoli",
    ],
    dinner: [
      "Baked salmon with asparagus",
      "Grilled chicken with sweet potato",
      "Chicken soup with vegetables",
      "Beef stir-fry with bell peppers",
      "Prawn curry with brown rice",
      "Egg scramble with spinach",
      "Grilled tuna steak with salad",
      "Turkey meatballs with zucchini noodles",
    ],
    snack: [
      "Boiled eggs (2)",
      "Chicken jerky",
      "Protein shake",
      "Tuna on rice cakes",
      "Greek yogurt",
      "Cottage cheese with fruit",
    ],
  },
};

function normalizeDiet(dietType = "") {
  const d = dietType.toLowerCase();
  return d.includes("non") || d.includes("chicken") || d.includes("meat") || d.includes("fish")
    ? "non_veg"
    : "veg";
}

function applyProgression(exercise, week) {
  const ex        = { ...exercise };
  const blockWeek = ((week - 1) % 4) + 1;
  const isDeload  = blockWeek === 4;

  if (isDeload) {
    ex.sets = Math.max(2, ex.sets - 1);
    if (ex.reps)         ex.reps         = Math.max(5, Math.round(ex.reps * 0.8));
    if (ex.duration_sec) ex.duration_sec  = Math.round(ex.duration_sec * 0.8);
    if (ex.duration_min) ex.duration_min  = Math.max(10, Math.round(ex.duration_min * 0.8));
    ex.est_kcal         = Math.round(ex.est_kcal * 0.8);
    ex.deload           = true;
    ex.progression_note = "Deload week — reduced volume for recovery.";
    return ex;
  }

  const phases = {
    1: { repDelta: 0,  weightMult: 1.0 },
    2: { repDelta: 2,  weightMult: 1.0 },
    3: { repDelta: -1, weightMult: 1.1 },
  };
  const phase = phases[blockWeek] ?? phases[1];

  if (ex.reps)         ex.reps         = Math.max(4, ex.reps + phase.repDelta);
  if (ex.duration_sec) ex.duration_sec += (blockWeek - 1) * 5;  // +5s/week
  if (ex.duration_min) ex.duration_min += (blockWeek - 1) * 2;  // +2 min/week

  if (ex.weight_kg > 0) {
    ex.weight_kg = Math.round(ex.weight_kg * phase.weightMult * 2) / 2; // nearest 0.5 kg
  }

  if (week > 4 && ex.weight_kg > 0) {
    const blocks      = Math.floor((week - 1) / 4);
    ex.weight_kg     += blocks * 2.5;
    ex.progression_note = `Weight +${blocks * 2.5}kg vs. Week 1 (cross-block gain).`;
  } else {
    ex.progression_note =
      blockWeek === 3 ? "Intensity phase: heavier weight, slightly fewer reps."
      : blockWeek === 2 ? "Volume phase: same weight, more reps."
      : "Foundation phase: establishing baseline.";
  }

  if (ex.reps && ex.weight_kg > 0) ex.total_volume_kg = ex.sets * ex.reps * ex.weight_kg;

  const volumeBoost = blockWeek === 2 ? 1.08 : blockWeek === 3 ? 1.05 : 1.0;
  ex.est_kcal = Math.round(ex.est_kcal * volumeBoost);
  ex.deload   = false;

  return ex;
}

function getRotatedSplit(splitName, week) {
  const blockWeek  = ((week - 1) % 4) + 1;
  const useVariant = blockWeek % 2 === 0;
  const variantKey = `${splitName} B`;
  return useVariant && EXERCISE_POOL[variantKey] ? variantKey : splitName;
}

function buildWeekMeals(dietKey, week, daysPerWeek = 7, targets = {}) {
  const pool  = MEAL_POOL[dietKey];
  const meals = [];

  for (let day = 1; day <= daysPerWeek; day++) {
    const idx = (week - 1 + day - 1) % pool.breakfast.length;
    meals.push({
      day,
      breakfast: pool.breakfast[idx],
      lunch:     pool.lunch[idx % pool.lunch.length],
      dinner:    pool.dinner[idx % pool.dinner.length],
      snack:     pool.snack[idx % pool.snack.length],
      daily_targets: {
        kcal:                targets.dailyKcal      ?? null,
        protein_g:           targets.proteinTarget  ?? null,
        carbs_g:             targets.carbsTarget    ?? null,
        fat_g:               targets.fatTarget      ?? null,
        hydration_L:         3.0,
        fruits_servings:     2,
        vegetables_servings: 3,
      },
    });
  }

  return meals;
}

function weekFocusTag(blockWeek, goals) {
  return {
    1: `Foundation — ${goals}`,
    2: `Volume Phase — ${goals}`,
    3: `Intensity Peak — ${goals}`,
    4: `Deload & Recovery`,
  }[blockWeek] ?? `Week ${blockWeek} — ${goals}`;
}


function buildRecoveryProtocol(isDeload) {
  return {
    rest_day_activity:  "20–30 min walking or yoga",
    sleep_hours_target: 8,
    sleep_tips: [
      "Avoid screens 30 min before bed",
      "Keep room cool (16–19°C)",
      "Consistent sleep/wake time boosts recovery",
    ],
    recovery_tools: isDeload
      ? ["Foam rolling (full body)", "Contrast shower", "Epsom salt bath", "Massage"]
      : ["Foam rolling (trained muscles)", "Contrast shower", "Light stretching"],
    protein_timing: "Consume 20–40g protein within 2 hours of workout for muscle repair.",
  };
}


function computeMacros(bodyWeightKg, goal) {
  const proteinMult   = goal?.includes("muscle") ? 2.2 : 1.8;
  const proteinTarget = Math.round(bodyWeightKg * proteinMult);
  const baseTDEE      = bodyWeightKg * 30;
  const kcalDelta     = goal?.includes("loss") ? -300 : goal?.includes("muscle") ? +250 : 0;
  const dailyKcal     = Math.round(baseTDEE + kcalDelta);
  const fatTarget     = Math.round(bodyWeightKg * 0.8);
  const carbsTarget   = Math.max(50, Math.round((dailyKcal - proteinTarget * 4 - fatTarget * 9) / 4));

  return { proteinTarget, dailyKcal, carbsTarget, fatTarget };
}


export function generatePlan({
  fitnessLevel      = "beginner",
  dietType          = "veg",
  duration          = 4,
  goals             = "general fitness",
  habits            = [],
  medicalConditions = [],
  bodyWeightKg      = 70,
  targetKcal        = null,
}) {
  const ACTIVITY_TO_FITNESS = {
    sedentary:         "beginner",
    lightly_active:    "beginner",
    moderately_active: "intermediate",
    very_active:       "advanced",
  };

  const mappedLevel = ACTIVITY_TO_FITNESS[fitnessLevel] ?? fitnessLevel;
  const splits      = SPLITS[mappedLevel] ?? SPLITS.beginner;
  const dietKey     = normalizeDiet(dietType);
  const macros      = computeMacros(bodyWeightKg, goals);
  if (targetKcal) macros.dailyKcal = targetKcal;

  const schedule = [];

  for (let week = 1; week <= duration; week++) {
    const blockWeek = ((week - 1) % 4) + 1;
    const isDeload  = blockWeek === 4;

    const workouts = splits.map((splitName) => {
      const rotatedSplit = getRotatedSplit(splitName, week);
      const exercisePool = EXERCISE_POOL[rotatedSplit] ?? EXERCISE_POOL[splitName] ?? [];
      const exercises    = exercisePool.map((ex) => applyProgression(ex, week));

      const totalKcal = exercises.reduce((s, ex) => s + (ex.est_kcal ?? 0), 0)
                      + WARMUP.reduce((s, w) => s + w.est_kcal, 0)
                      + COOLDOWN.reduce((s, c) => s + c.est_kcal, 0);

      const muscleGroups = [...new Set(exercises.flatMap((ex) => ex.muscles))];

      return {
        split:                   splitName,
        variation:               rotatedSplit,
        warmup:                  WARMUP,
        exercises,
        cooldown:                COOLDOWN,
        estimated_kcal_burned:   totalKcal,
        muscle_groups:           muscleGroups,
        is_deload:               isDeload,
        difficulty_rating:       null,
        missed_workout_recovery: MISSED_WORKOUT_RECOVERY[splitName] ?? "20-min light walk",
        ...(splitName === "Legs" && {
          recovery_reminder: "Allow 48h before next leg session. Prioritise protein intake today.",
        }),
      };
    });

    const meals = buildWeekMeals(dietKey, week, 7, macros);

    schedule.push({
      week,
      block_week:        blockWeek,
      is_deload:         isDeload,
      focus:             weekFocusTag(blockWeek, goals),
      workouts,
      meals,
      habits,
      daily_wellness: {
        water_L:             3.0,
        electrolyte_sources: ["Banana (potassium)", "Salted nuts (sodium)", "Coconut water", "Spinach (magnesium)"],
        caffeine_advice:     "Limit caffeine after 2 PM for better sleep quality.",
      },
      recovery_protocol: buildRecoveryProtocol(isDeload),
      nutrition_targets: macros,
    });
  }

  return {
    summary: {
      duration_weeks:     duration,
      fitness_level:      mappedLevel,
      diet_type:          dietKey,
      goal:               goals,
      body_weight_kg:     bodyWeightKg,
      medical_conditions: medicalConditions,
      total_workouts:     schedule.length * splits.length,
      macro_targets:      macros,
    },
    schedule,
    generated_at: new Date().toISOString(),
  };
}