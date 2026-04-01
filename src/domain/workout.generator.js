// src/domain/workout.generator.js

const VALID_GOALS           = ['muscle_gain', 'weight_loss', 'endurance', 'maintain_fitness'];
const VALID_ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'athlete'];
const VALID_EQUIPMENT       = ['bodyweight', 'dumbbells', 'barbell', 'machines', 'full_gym'];

const FORCED_REST_DAYS = ['saturday'];
const REST_MARKER      = ['Rest'];

const PROGRESSION = {
  RPE_EASY:   5,    
  RPE_MEDIUM: 7,
  RPE_HARD:   10,  

  REPS_INCREMENT:   1,    
  WEIGHT_INCREMENT: 2.5,  
  SET_INCREMENT:    1,    

  REP_CEILING: {
    muscle_gain:      12,
    weight_loss:      18,
    endurance:        25,
    maintain_fitness: 15,
  },

  SET_CEILING: {
    1: 3,   
    2: 4,  
    3: 5, 
  },

  DELOAD_VOLUME_FACTOR: 0.80,  
  DELOAD_WEIGHT_FACTOR: 0.65,  
};

const MET_VALUES = {
  'Push-Ups': 3.8,            'Wide Push-Ups': 3.8,          'Incline Push-Ups': 3.5,
  'Dumbbell Bench Press': 5.0,'Dumbbell Flys': 4.5,          'Incline Dumbbell Press': 5.0,
  'Barbell Bench Press': 6.0, 'Cable Fly': 4.5,              'Chest Dip': 5.5,
  'Pec Deck Machine': 4.0,    'Superman Hold': 2.5,          'Resistance Band Row': 3.5,
  'Dumbbell Row': 5.0,        'Pull-Ups': 8.0,               'Chin-Ups': 8.0,
  'Lat Pulldown': 5.0,        'Seated Cable Row': 5.0,       'Bent Over Barbell Row': 6.0,
  'T-Bar Row': 6.0,           'Deadlift': 7.5,               'Pike Push-Ups': 4.0,
  'Lateral Raises': 3.5,      'Front Raises': 3.5,           'Dumbbell Shoulder Press': 5.0,
  'Arnold Press': 5.0,        'Barbell Overhead Press': 6.0, 'Cable Lateral Raise': 3.5,
  'Face Pulls': 3.5,          'Isometric Bicep Hold': 2.5,   'Dumbbell Curl': 3.5,
  'Hammer Curl': 3.5,         'Concentration Curl': 3.5,     'Barbell Curl': 4.0,
  'Preacher Curl': 4.0,       'Cable Curl': 3.5,             'Incline Dumbbell Curl': 3.5,
  'Diamond Push-Ups': 4.5,    'Tricep Dips (Chair)': 4.5,    'Overhead Tricep Ext.': 3.5,
  'Kickbacks': 3.5,           'Skull Crushers': 4.0,         'Cable Pushdown': 3.5,
  'Close Grip Bench Press': 5.5,'Bodyweight Squat': 5.0,     'Lunges': 5.0,
  'Glute Bridge': 4.0,        'Step-Ups': 5.5,               'Dumbbell Squat': 5.5,
  'Romanian Deadlift': 6.0,   'Dumbbell Lunge': 5.5,         'Barbell Squat': 7.0,
  'Leg Press': 5.0,           'Leg Curl': 4.0,               'Leg Extension': 4.0,
  'Calf Raises': 3.0,         'Plank': 3.0,                  'Crunches': 3.5,
  'Bicycle Crunches': 5.0,    'Mountain Climbers': 8.0,      'Russian Twists': 4.5,
  'Dead Bug': 3.0,            'Hanging Leg Raise': 4.5,      'Cable Crunch': 4.0,
  'Ab Wheel Rollout': 6.0,
  'Jumping Jacks': 7.0,       'High Knees': 8.0,             'Burpees': 10.0,
  'Jump Rope': 10.0,          'Mountain Climbers (Cardio)': 8.0,'Sprint Intervals': 13.5,
  'Box Jumps': 10.0,          'Treadmill Run': 9.8,          'Rowing Machine': 8.5,
  'Stationary Bike': 6.8,     'Stair Climber': 9.0,          'Elliptical': 5.5,
};
const DEFAULT_MET = 4.5;

const EXERCISE_POOL = {
  chest: [
    { name: 'Push-Ups',               equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Wide Push-Ups',          equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Incline Push-Ups',       equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'C' },
    { name: 'Dumbbell Bench Press',   equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Incline Dumbbell Press', equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Dumbbell Flys',          equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Barbell Bench Press',    equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
    { name: 'Cable Fly',              equipment: ['machines','full_gym'],  difficulty: 2, tier: 'B' },
    { name: 'Chest Dip',              equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Pec Deck Machine',       equipment: ['machines','full_gym'],  difficulty: 2, tier: 'C' },
  ],
  back: [
    { name: 'Superman Hold',          equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'C' },
    { name: 'Resistance Band Row',    equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Dumbbell Row',           equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Pull-Ups',               equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Chin-Ups',               equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Lat Pulldown',           equipment: ['machines','full_gym'],  difficulty: 2, tier: 'B' },
    { name: 'Seated Cable Row',       equipment: ['machines','full_gym'],  difficulty: 2, tier: 'C' },
    { name: 'Bent Over Barbell Row',  equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
    { name: 'T-Bar Row',              equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'B' },
    { name: 'Deadlift',               equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
  ],
  shoulders: [
    { name: 'Pike Push-Ups',           equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Lateral Raises',          equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Front Raises',            equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Dumbbell Shoulder Press', equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Arnold Press',            equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Barbell Overhead Press',  equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
    { name: 'Cable Lateral Raise',     equipment: ['machines','full_gym'],  difficulty: 2, tier: 'C' },
    { name: 'Face Pulls',              equipment: ['machines','full_gym'],  difficulty: 2, tier: 'B' },
  ],
  biceps: [
    { name: 'Isometric Bicep Hold',  equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'C' },
    { name: 'Dumbbell Curl',         equipment: ['dumbbells','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Hammer Curl',           equipment: ['dumbbells','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Concentration Curl',    equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Barbell Curl',          equipment: ['barbell','full_gym'],   difficulty: 2, tier: 'A' },
    { name: 'Preacher Curl',         equipment: ['machines','full_gym'],  difficulty: 2, tier: 'B' },
    { name: 'Cable Curl',            equipment: ['machines','full_gym'],  difficulty: 2, tier: 'B' },
    { name: 'Incline Dumbbell Curl', equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'C' },
  ],
  triceps: [
    { name: 'Diamond Push-Ups',       equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Tricep Dips (Chair)',     equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Overhead Tricep Ext.',    equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Kickbacks',               equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Skull Crushers',          equipment: ['barbell','dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Cable Pushdown',          equipment: ['machines','full_gym'],  difficulty: 2, tier: 'A' },
    { name: 'Close Grip Bench Press',  equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
  ],
  legs: [
    { name: 'Bodyweight Squat', equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Lunges',           equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Glute Bridge',     equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'C' },
    { name: 'Step-Ups',         equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Dumbbell Squat',   equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Romanian Deadlift',equipment: ['dumbbells','barbell','full_gym'], difficulty: 2, tier: 'A' },
    { name: 'Dumbbell Lunge',   equipment: ['dumbbells','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Barbell Squat',    equipment: ['barbell','full_gym'],   difficulty: 3, tier: 'A' },
    { name: 'Leg Press',        equipment: ['machines','full_gym'],  difficulty: 2, tier: 'A' },
    { name: 'Leg Curl',         equipment: ['machines','full_gym'],  difficulty: 2, tier: 'C' },
    { name: 'Leg Extension',    equipment: ['machines','full_gym'],  difficulty: 2, tier: 'C' },
    { name: 'Calf Raises',      equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'C' },
  ],
  core: [
    { name: 'Plank',              equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Crunches',           equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'A' },
    { name: 'Bicycle Crunches',   equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, tier: 'B' },
    { name: 'Mountain Climbers',  equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Russian Twists',     equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Dead Bug',           equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, tier: 'C' },
    { name: 'Hanging Leg Raise',  equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 3, tier: 'A' },
    { name: 'Cable Crunch',       equipment: ['machines','full_gym'], difficulty: 2, tier: 'B' },
    { name: 'Ab Wheel Rollout',   equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 3, tier: 'A' },
  ],
  cardio: [
    { name: 'Jumping Jacks',              equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, isCardio: true, type: 'hiit',   duration: '45 sec', rest: '15 sec', rounds: 4, tier: 'A' },
    { name: 'High Knees',                 equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 1, isCardio: true, type: 'hiit',   duration: '40 sec', rest: '20 sec', rounds: 4, tier: 'B' },
    { name: 'Burpees',                    equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, isCardio: true, type: 'hiit',   duration: '30 sec', rest: '30 sec', rounds: 5, tier: 'A' },
    { name: 'Jump Rope',                  equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, isCardio: true, type: 'hiit',   duration: '60 sec', rest: '30 sec', rounds: 5, tier: 'B' },
    { name: 'Mountain Climbers (Cardio)', equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 2, isCardio: true, type: 'hiit',   duration: '45 sec', rest: '15 sec', rounds: 4, tier: 'C' },
    { name: 'Sprint Intervals',           equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 3, isCardio: true, type: 'hiit',   duration: '20 sec', rest: '40 sec', rounds: 8, tier: 'A' },
    { name: 'Box Jumps',                  equipment: ['bodyweight','dumbbells','barbell','machines','full_gym'], difficulty: 3, isCardio: true, type: 'hiit',   duration: '30 sec', rest: '30 sec', rounds: 5, tier: 'B' },
    { name: 'Treadmill Run',              equipment: ['machines','full_gym'], difficulty: 2, isCardio: true, type: 'steady', duration: '30 min', rounds: 1, tier: 'A' },
    { name: 'Rowing Machine',             equipment: ['machines','full_gym'], difficulty: 2, isCardio: true, type: 'steady', duration: '25 min', rounds: 1, tier: 'B' },
    { name: 'Stationary Bike',            equipment: ['machines','full_gym'], difficulty: 1, isCardio: true, type: 'steady', duration: '30 min', rounds: 1, tier: 'C' },
    { name: 'Stair Climber',              equipment: ['machines','full_gym'], difficulty: 2, isCardio: true, type: 'steady', duration: '20 min', rounds: 1, tier: 'B' },
    { name: 'Elliptical',                 equipment: ['machines','full_gym'], difficulty: 1, isCardio: true, type: 'steady', duration: '30 min', rounds: 1, tier: 'A' },
  ],
};

const FOCUS_TO_MUSCLES = {
  'Chest':                          ['chest'],
  'Triceps':                        ['triceps'],
  'Back':                           ['back'],
  'Biceps':                         ['biceps'],
  'Shoulders':                      ['shoulders'],
  'Core':                           ['core'],
  'Legs':                           ['legs'],
  'Lower Body':                     ['legs'],
  'Upper Body':                     ['chest','back','shoulders'],
  'Full Body':                      ['chest','back','legs','shoulders','core'],
  'Full Body (Light)':              ['chest','back','legs'],
  'Cardio (Moderate)':              ['cardio'],
  'Cardio (30 min)':                ['cardio'],
  'Cardio (Intervals)':             ['cardio'],
  'Moderate Cardio':                ['cardio'],
  'Low-Intensity Cardio (30 min)':  ['cardio'],
  'Upper Body (Accessory)':         ['biceps','triceps','shoulders'],
  'Upper Body (Light)':             ['chest','shoulders'],
  'Lower Body Strength':            ['legs'],
  'Legs (Light)':                   ['legs'],
  'Legs (Light Strength)':          ['legs'],
  'Legs (Strength + Short Cardio)': ['legs','cardio'],
  'Full Body Strength':             ['chest','back','legs'],
};

const WEEK_TO_TIER = { 1: 'A', 2: 'B', 3: 'C', 4: 'A' };


export function generateWorkoutPlan(profile, weekInMesocycle = 1, progressionMap = {}) {
  const validation = validateProfile(profile);
  if (!validation.isValid) throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);

  const {
    goal,
    activity_level,
    age,
    equipment       = 'bodyweight',
    medical_conditions = {},
    recent_exercise_names = [],
  } = profile;

  const conditions         = Object.keys(medical_conditions).filter(k => medical_conditions[k] === true);
  const normalizedEquipment = normalizeEquipment(equipment);
  const intensity          = resolveIntensity(activity_level, age, conditions);
  const difficultyLevel    = resolveDifficulty(activity_level, age, conditions);
  const isDeloadWeek       = weekInMesocycle === 4;
  const rotationTier       = WEEK_TO_TIER[weekInMesocycle] || 'A';

  let weeklySplit = buildWeeklySplit(goal, intensity, conditions, weekInMesocycle);

  for (const day of FORCED_REST_DAYS) weeklySplit[day] = REST_MARKER;

  const dailyExercises = buildDailyExercises(
    weeklySplit,
    normalizedEquipment,
    difficultyLevel,
    goal,
    recent_exercise_names,
    rotationTier,
    isDeloadWeek,
    progressionMap,
    profile.body_weight_kg || 70,
  );

  const workoutDetails = buildWorkoutDetails(goal, intensity, conditions, isDeloadWeek);

  return {
    meta: {
      goal,
      activity_level,
      age,
      equipment:         normalizedEquipment,
      intensity,
      difficulty_level:  difficultyLevel,
      medical_conditions: conditions,
      week_in_mesocycle: weekInMesocycle,
      rotation_tier:     rotationTier,
      is_deload_week:    isDeloadWeek,
      generated_at:      new Date().toISOString(),
    },
    weekly_plan:         weeklySplit,
    daily_exercises:     dailyExercises,
    workout_details:     workoutDetails,
    progression_targets: extractProgressionTargets(dailyExercises),
    guidelines:          buildGuidelines(intensity, conditions, isDeloadWeek),
    safety_notes:        buildSafetyNotes(conditions),
    disclaimers: [
      'This is a general fitness guide and not medical advice',
      'Consult with a healthcare provider before starting any new exercise program',
      'Stop immediately if you experience pain, dizziness, or unusual symptoms',
    ],
  };
}

export function computeProgression(lastSession, goal, difficultyLevel, isNextDeloadWeek = false) {
  const { sets, reps, weight = 0, all_sets_completed, rpe = 6 } = lastSession;
  if (isNextDeloadWeek) {
    return {
      sets:             Math.max(1, Math.floor(sets * PROGRESSION.DELOAD_VOLUME_FACTOR)),
      reps,
      weight:           weight > 0 ? parseFloat((weight * PROGRESSION.DELOAD_WEIGHT_FACTOR).toFixed(1)) : 0,
      progression_type: 'deload',
    };
  }

  if (!all_sets_completed || rpe >= PROGRESSION.RPE_HARD) {
    return { sets, reps, weight, progression_type: 'maintain' };
  }

  if (rpe > PROGRESSION.RPE_MEDIUM) {
    return { sets, reps, weight, progression_type: 'maintain_hard' };
  }

  const repCeiling = PROGRESSION.REP_CEILING[goal] || 15;
  const setCeiling = PROGRESSION.SET_CEILING[difficultyLevel] || 4;

  if (reps < repCeiling) {
    return {
      sets,
      reps:             reps + PROGRESSION.REPS_INCREMENT,
      weight,
      progression_type: 'reps_increase',
    };
  }

  if (weight > 0) {
    const baseReps = goal === 'muscle_gain' ? 8 : goal === 'weight_loss' ? 12 : 10;
    return {
      sets,
      reps:             baseReps,
      weight:           parseFloat((weight + PROGRESSION.WEIGHT_INCREMENT).toFixed(1)),
      progression_type: 'weight_increase',
    };
  }

  if (sets < setCeiling) {
    return {
      sets:             sets + PROGRESSION.SET_INCREMENT,
      reps:             Math.max(reps - 2, 8), 
      weight,
      progression_type: 'set_increase',
    };
  }

  return { sets, reps, weight, progression_type: 'at_ceiling' };
}

export function estimateCaloriesBurned(exerciseName, sets, reps, restSeconds, bodyWeightKg = 70) {
  const met = MET_VALUES[exerciseName] || DEFAULT_MET;
  const activeSeconds  = sets * reps * 3;
  const restTotalSecs  = sets * (restSeconds || 60);
  const totalHours     = (activeSeconds + restTotalSecs) / 3600;
  return Math.round(met * bodyWeightKg * totalHours);
}

function normalizeEquipment(equipment) {
  return VALID_EQUIPMENT.includes(equipment) ? equipment : 'bodyweight';
}

function resolveDifficulty(activityLevel, age, conditions) {
  if (conditions.includes('heart_disease') || conditions.includes('injury')) return 1;
  if (age >= 65) return 1;
  if (age >= 50) return conditions.length > 0 ? 1 : 2;
  if (conditions.length >= 2) return 1;
  switch (activityLevel) {
    case 'sedentary':          return 1;
    case 'lightly_active':     return 1;
    case 'moderately_active':  return 2;
    case 'very_active':        return 3;
    case 'athlete':            return 3;
    default:                   return 2;
  }
}

function pickExercises(muscleGroups, equipment, difficultyLevel, goal, recentNames, rotationTier, count = 3) {
  const allExercises = [];
  for (const group of muscleGroups) {
    const pool = EXERCISE_POOL[group] ?? [];
    const filtered = pool.filter(ex =>
      ex.equipment.includes(equipment) &&
      ex.difficulty <= difficultyLevel
    );
    allExercises.push(...filtered);
  }
  if (!allExercises.length) return [];

  const tierFresh  = allExercises.filter(ex => ex.tier === rotationTier && !recentNames.includes(ex.name));
  const tierStale  = allExercises.filter(ex => ex.tier === rotationTier &&  recentNames.includes(ex.name));
  const otherFresh = allExercises.filter(ex => ex.tier !== rotationTier && !recentNames.includes(ex.name));
  const fallback   = allExercises.filter(ex => ex.tier !== rotationTier &&  recentNames.includes(ex.name));

  const prioritised = [...tierFresh, ...tierStale, ...otherFresh, ...fallback];
  return shuffled(prioritised).slice(0, count);
}

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildDailyExercises(weeklySplit, equipment, difficultyLevel, goal, recentNames, rotationTier, isDeloadWeek, progressionMap, bodyWeightKg) {
  const result = {};

  for (const [day, focusAreas] of Object.entries(weeklySplit)) {
    const isRest = !focusAreas?.length || focusAreas.every(g => /^rest/i.test(g.trim()));
    if (isRest) { result[day] = []; continue; }

    const muscleGroups = [];
    for (const focus of focusAreas) {
      const muscles = FOCUS_TO_MUSCLES[focus];
      if (muscles) muscleGroups.push(...muscles);
    }
    const uniqueMuscles = [...new Set(muscleGroups)];
    const isCardioDay   = uniqueMuscles.length > 0 && uniqueMuscles.every(m => m === 'cardio');
    const hasMixedCardio = uniqueMuscles.includes('cardio') && !isCardioDay;

    let exercises = [];

    if (isCardioDay) {
      const cardioCount = isDeloadWeek ? 3 : (difficultyLevel === 3 ? 6 : difficultyLevel === 2 ? 5 : 4);
      const picked = pickExercises(['cardio'], equipment, difficultyLevel, goal, recentNames, rotationTier, cardioCount);
      exercises = picked.map(ex => formatCardioExercise(ex, goal, difficultyLevel, isDeloadWeek, bodyWeightKg));
    } else if (hasMixedCardio) {
      const strengthMuscles = uniqueMuscles.filter(m => m !== 'cardio');
      const strengthCount   = isDeloadWeek
        ? Math.max(2, Math.floor(resolveExerciseCount(goal, difficultyLevel, strengthMuscles.length) * PROGRESSION.DELOAD_VOLUME_FACTOR))
        : resolveExerciseCount(goal, difficultyLevel, strengthMuscles.length);
      const cardioPicked    = pickExercises(['cardio'], equipment, difficultyLevel, goal, recentNames, rotationTier, 2);
      const strengthPicked  = pickExercises(strengthMuscles, equipment, difficultyLevel, goal, recentNames, rotationTier, strengthCount);
      exercises = [
        ...strengthPicked.map(ex => formatStrengthExercise(ex, goal, difficultyLevel, isDeloadWeek, progressionMap, bodyWeightKg)),
        ...cardioPicked.map(ex => formatCardioExercise(ex, goal, difficultyLevel, isDeloadWeek, bodyWeightKg)),
      ];
    } else {
      const count  = isDeloadWeek
        ? Math.max(2, Math.floor(resolveExerciseCount(goal, difficultyLevel, uniqueMuscles.length) * PROGRESSION.DELOAD_VOLUME_FACTOR))
        : resolveExerciseCount(goal, difficultyLevel, uniqueMuscles.length);
      const picked = pickExercises(uniqueMuscles, equipment, difficultyLevel, goal, recentNames, rotationTier, count);
      exercises = picked.map(ex => formatStrengthExercise(ex, goal, difficultyLevel, isDeloadWeek, progressionMap, bodyWeightKg));
    }

    result[day] = exercises;
  }

  return result;
}

function formatStrengthExercise(ex, goal, difficultyLevel, isDeloadWeek, progressionMap, bodyWeightKg) {
  const base = resolveSetRep(goal, difficultyLevel);

  const prog = progressionMap[ex.name];
  let { sets, reps, rest_seconds } = base;
  let weight       = prog?.weight    || 0;
  let progressionNote = null;

  if (prog) {
    sets = prog.sets ?? sets;
    reps = prog.reps ?? reps;
    weight = prog.weight ?? 0;
    progressionNote = prog.progression_type || null;
  }

  if (isDeloadWeek) {
    sets   = Math.max(1, Math.floor(sets * PROGRESSION.DELOAD_VOLUME_FACTOR));
    weight = weight > 0 ? parseFloat((weight * PROGRESSION.DELOAD_WEIGHT_FACTOR).toFixed(1)) : 0;
  }

  const kcal = estimateCaloriesBurned(ex.name, sets, reps, rest_seconds, bodyWeightKg);

  return {
    name:             ex.name,
    muscle_group:     ex.muscle_group || null,
    isCardio:         false,
    tier:             ex.tier,
    sets,
    reps,
    weight_kg:        weight,
    rest_seconds,
    estimated_kcal:   kcal,
    progression_note: progressionNote,
    is_deload:        isDeloadWeek,
  };
}

function formatCardioExercise(ex, goal, difficultyLevel, isDeloadWeek, bodyWeightKg) {
  const BASE = ex.rounds ?? 4;
  let rounds;
  if (isDeloadWeek) {
    rounds = Math.max(2, Math.floor(BASE * PROGRESSION.DELOAD_VOLUME_FACTOR));
  } else if (goal === 'weight_loss' && difficultyLevel === 3) rounds = Math.min(BASE + 1, 6);
  else if (goal === 'weight_loss' && difficultyLevel === 2)   rounds = Math.min(BASE, 5);
  else if (difficultyLevel === 3)  rounds = Math.min(BASE, 5);
  else if (difficultyLevel === 2)  rounds = Math.min(BASE, 4);
  else                             rounds = Math.min(BASE, 3);

  const restSecs = parseDurationToSeconds(ex.rest ?? '20 sec');
  const kcal     = estimateCaloriesBurned(ex.name, rounds, 1, restSecs, bodyWeightKg);

  return {
    name:           ex.name,
    isCardio:       true,
    tier:           ex.tier,
    type:           ex.type ?? 'hiit',
    sets:           rounds,
    reps:           ex.duration ?? '45 sec',
    rest_seconds:   ex.type === 'steady' ? null : parseDurationToSeconds(ex.rest ?? '20 sec'),
    duration:       ex.duration,
    rest:           ex.rest,
    rounds,
    estimated_kcal: kcal,
    is_deload:      isDeloadWeek,
  };
}

function parseDurationToSeconds(str) {
  if (!str) return null;
  if (/min/.test(str)) return parseInt(str) * 60;
  return parseInt(str) || null;
}

function resolveExerciseCount(goal, difficultyLevel, focusGroupCount) {
  const base = focusGroupCount > 2 ? 6 : 4;
  if (difficultyLevel === 1) return Math.max(3, base - 1);
  if (difficultyLevel === 3) return base + 2;
  return base;
}

function resolveSetRep(goal, difficultyLevel) {
  if (goal === 'muscle_gain') {
    return difficultyLevel === 1
      ? { sets: 2, reps: 12, rest_seconds: 90 }
      : difficultyLevel === 2
        ? { sets: 3, reps: 10, rest_seconds: 75 }
        : { sets: 4, reps: 8,  rest_seconds: 60 };
  }
  if (goal === 'weight_loss') {
    return difficultyLevel === 1
      ? { sets: 2, reps: 15, rest_seconds: 60 }
      : difficultyLevel === 2
        ? { sets: 3, reps: 15, rest_seconds: 45 }
        : { sets: 4, reps: 15, rest_seconds: 30 };
  }
  if (goal === 'endurance') {
    return { sets: 3, reps: 20, rest_seconds: 30 };
  }
  return { sets: 3, reps: 12, rest_seconds: 60 };
a}

function extractProgressionTargets(dailyExercises) {
  const targets = {};
  for (const exercises of Object.values(dailyExercises)) {
    for (const ex of exercises) {
      if (!ex.isCardio) {
        targets[ex.name] = { sets: ex.sets, reps: ex.reps, weight_kg: ex.weight_kg };
      }
    }
  }
  return targets;
}

function validateProfile(profile) {
  const errors = [];
  if (!profile) return { isValid: false, errors: ['Profile is required'] };
  if (!profile.goal || !VALID_GOALS.includes(profile.goal))
    errors.push(`Invalid goal. Must be one of: ${VALID_GOALS.join(', ')}`);
  if (!profile.activity_level || !VALID_ACTIVITY_LEVELS.includes(profile.activity_level))
    errors.push(`Invalid activity_level. Must be one of: ${VALID_ACTIVITY_LEVELS.join(', ')}`);
  if (typeof profile.age !== 'number' || profile.age < 13 || profile.age > 120)
    errors.push('Age must be a number between 13 and 120');
  if (profile.equipment && !VALID_EQUIPMENT.includes(profile.equipment))
    errors.push(`Invalid equipment. Must be one of: ${VALID_EQUIPMENT.join(', ')}`);
  return { isValid: errors.length === 0, errors };
}


function resolveIntensity(activityLevel, age, conditions) {
  if (conditions.includes('heart_disease')) return 'low';
  if (age >= 65) return 'low';
  if (age >= 50) return conditions.length > 0 ? 'low' : 'low-to-moderate';
  if (conditions.length >= 2) return 'low-to-moderate';
  if (conditions.length === 1) return 'moderate';
  switch (activityLevel) {
    case 'sedentary':          return 'low';
    case 'lightly_active':     return 'low-to-moderate';
    case 'moderately_active':  return 'moderate';
    case 'very_active':        return 'moderate-to-high';
    case 'athlete':            return 'high';
    default:                   return 'moderate';
  }
}

function buildWeeklySplit(goal, intensity, conditions, weekInMesocycle = 1) {
  const hasJointIssues      = conditions.includes('arthritis') || conditions.includes('injury');
  const hasCardiacCondition = conditions.includes('heart_disease') || conditions.includes('hypertension');
  const isLowIntensity      = intensity === 'low' || intensity === 'low-to-moderate';

  if (goal === 'muscle_gain') {
    if (isLowIntensity || hasJointIssues) {
      return {
        sunday:    ['Full Body (Light)'],
        monday:    ['Upper Body'],
        tuesday:   ['Rest / Stretching'],
        wednesday: weekInMesocycle % 2 === 0 ? ['Core', 'Upper Body (Light)'] : ['Upper Body (Light)'],
        thursday:  ['Rest / Mobility'],
        friday:    ['Lower Body'],
        saturday:  REST_MARKER,
      };
    }
    // Alternate push/pull order to vary stimulus
    const pushPull = weekInMesocycle % 2 === 0
      ? { sun: ['Back', 'Biceps'],   mon: ['Chest', 'Triceps'] }
      : { sun: ['Chest', 'Triceps'], mon: ['Back', 'Biceps']  };
    return {
      sunday:    pushPull.sun,
      monday:    pushPull.mon,
      tuesday:   ['Rest / Light Cardio'],
      wednesday: ['Shoulders', 'Core'],
      thursday:  ['Upper Body (Accessory)'],
      friday:    ['Legs'],
      saturday:  REST_MARKER,
    };
  }

  if (goal === 'weight_loss') {
    if (hasCardiacCondition) {
      return {
        sunday:    ['Full Body Strength'],
        monday:    ['Low-Intensity Cardio (30 min)'],
        tuesday:   ['Upper Body'],
        wednesday: ['Rest'],
        thursday:  ['Lower Body Strength'],
        friday:    ['Legs (Light)'],
        saturday:  REST_MARKER,
      };
    }
    if (isLowIntensity) {
      return {
        sunday:    ['Full Body Strength'],
        monday:    ['Moderate Cardio'],
        tuesday:   ['Upper Body', 'Core'],
        wednesday: ['Rest'],
        thursday:  ['Lower Body'],
        friday:    weekInMesocycle % 2 === 0 ? ['Legs', 'Core'] : ['Legs', 'Light Cardio'],
        saturday:  REST_MARKER,
      };
    }
    return {
      sunday:    ['Full Body', 'Cardio (30 min)'],
      monday:    ['Upper Body', 'Core'],
      tuesday:   ['Cardio (Moderate)'],
      wednesday: ['Lower Body'],
      thursday:  ['Cardio (30 min)'],
      friday:    ['Legs', 'Light Cardio'],
      saturday:  REST_MARKER,
    };
  }

  if (goal === 'endurance') {
    if (hasCardiacCondition || isLowIntensity) {
      return {
        sunday:    ['Moderate Cardio (30–40 min)'],
        monday:    ['Rest'],
        tuesday:   ['Lower Body Strength'],
        wednesday: ['Moderate Cardio (30 min)'],
        thursday:  ['Upper Body Strength'],
        friday:    ['Legs (Light Strength)'],
        saturday:  REST_MARKER,
      };
    }
    return {
      sunday:    ['Cardio (Moderate 40 min)'],
      monday:    ['Lower Body Strength'],
      tuesday:   ['Cardio (Intervals 30–40 min)'],
      wednesday: ['Upper Body Strength'],
      thursday:  ['Cardio (Moderate)'],
      friday:    ['Legs (Strength + Short Cardio)'],
      saturday:  REST_MARKER,
    };
  }

  return {
    sunday:    ['Full Body Strength'],
    monday:    ['Cardio (20–30 min)'],
    tuesday:   ['Upper Body'],
    wednesday: ['Rest'],
    thursday:  ['Lower Body'],
    friday:    ['Legs'],
    saturday:  REST_MARKER,
  };
}

function buildWorkoutDetails(goal, intensity, conditions, isDeloadWeek) {
  return {
    sets_range:        isDeloadWeek ? 'Deload — 1–2 sets per exercise (−20% volume)' : getSetsRange(intensity),
    reps_range:        getRepsRange(goal, intensity),
    rest_between_sets: getRestPeriod(goal, intensity),
    cardio_guidance:   getCardioGuidance(goal, intensity, conditions),
    deload_note:       isDeloadWeek ? 'This is a deload week. Reduce weight to ~65% of last working weight. Focus on movement quality and recovery.' : null,
  };
}

function getSetsRange(intensity) {
  switch (intensity) {
    case 'low':              return '1–2 sets per exercise';
    case 'low-to-moderate':  return '2–3 sets per exercise';
    case 'moderate':         return '3–4 sets per exercise';
    case 'moderate-to-high':
    case 'high':             return '3–5 sets per exercise';
    default:                 return '3 sets per exercise';
  }
}

function getRepsRange(goal, intensity) {
  if (goal === 'muscle_gain')
    return (intensity === 'low' || intensity === 'low-to-moderate') ? '10–15 reps (lighter weight)' : '6–12 reps (moderate to heavy weight)';
  if (goal === 'endurance')   return '12–20 reps (lighter weight, higher volume)';
  if (goal === 'weight_loss') return '10–15 reps (moderate weight, keep heart rate elevated)';
  return '8–12 reps';
}

function getRestPeriod(goal, intensity) {
  if (intensity === 'low' || intensity === 'low-to-moderate') return '60–90 seconds between sets';
  if (goal === 'muscle_gain')  return '60–120 seconds between sets';
  if (goal === 'weight_loss')  return '30–60 seconds between sets (circuit style optional)';
  if (goal === 'endurance')    return '30–45 seconds between sets';
  return '60 seconds between sets';
}

function getCardioGuidance(goal, intensity, conditions) {
  const hasCardiac = conditions.includes('heart_disease') || conditions.includes('hypertension');
  if (hasCardiac)
    return { type: 'Low-intensity steady state', duration: '20–30 minutes', frequency: '3–4 times per week', target_heart_rate: '50–60% of max heart rate', note: 'Monitor heart rate closely' };
  if (intensity === 'low' || intensity === 'low-to-moderate')
    return { type: 'Moderate steady state (walking, cycling, swimming)', duration: '20–40 minutes', frequency: '3–5 times per week', target_heart_rate: '60–70% of max heart rate' };
  if (goal === 'weight_loss')
    return { type: 'Mix of HIIT and steady state', duration: '20–45 minutes', frequency: '4–6 times per week', target_heart_rate: '70–85% of max heart rate' };
  if (goal === 'endurance')
    return { type: 'Long duration steady state with interval training', duration: '30–60 minutes', frequency: '4–6 times per week', target_heart_rate: '65–80% of max heart rate' };
  return { type: 'Moderate cardio (your choice)', duration: '20–30 minutes', frequency: '3–4 times per week', target_heart_rate: '60–75% of max heart rate' };
}

function buildGuidelines(intensity, conditions, isDeloadWeek) {
  const guidelines = {
    warmup:           intensity === 'low' || intensity === 'low-to-moderate' ? '5–10 minutes gentle movement and stretching' : '5–10 minutes dynamic warm-up',
    cooldown:         '5–10 minutes stretching & light mobility work',
    progression:      isDeloadWeek ? 'Deload week — maintain form, reduce load. No PRs this week.' : getProgressionGuidance(intensity),
    rest_days:        'At least 1–2 complete rest days per week',
    hydration:        'Drink water before, during, and after workouts',
    form_over_weight: 'Always prioritize proper form over lifting heavier weights',
  };
  if (conditions.includes('diabetes'))
    guidelines.blood_sugar = 'Monitor blood sugar before and after workouts, keep fast-acting carbs nearby';
  return guidelines;
}

function getProgressionGuidance(intensity) {
  switch (intensity) {
    case 'low':              return 'Increase reps or weight every 2–3 weeks, focus on consistency';
    case 'low-to-moderate':  return 'Increase reps or weight every 1–2 weeks gradually';
    case 'moderate':         return 'Progressive overload every 1–2 weeks: +1 rep per set or +2.5 kg once rep ceiling is hit';
    case 'moderate-to-high':
    case 'high':             return 'Progressive overload weekly: increase reps → then weight → then add a set. Deload every 4th week.';
    default:                 return 'Increase difficulty progressively every 1–2 weeks';
  }
}

function buildSafetyNotes(conditions) {
  if (!conditions.length) {
    return [
      'Maintain proper form throughout all exercises',
      'Stay well hydrated',
      'Stop if you experience pain or discomfort',
    ];
  }
  const notes = [];
  if (conditions.includes('hypertension')) {
    notes.push('Avoid holding breath during lifts (no Valsalva maneuver)');
    notes.push('Monitor blood pressure regularly and stay within safe heart rate zones');
  }
  if (conditions.includes('diabetes')) {
    notes.push('Monitor blood sugar before and after workouts');
    notes.push('Keep fast-acting carbohydrates nearby in case of hypoglycemia');
    notes.push('Exercise at consistent times to help regulate blood sugar');
  }
  if (conditions.includes('heart_disease')) {
    notes.push('Keep intensity low to moderate and avoid sudden spikes in heart rate');
    notes.push('Wear a heart rate monitor and stay within prescribed zones');
    notes.push('Stop immediately if experiencing chest pain, dizziness, or shortness of breath');
  }
  if (conditions.includes('arthritis')) {
    notes.push('Avoid high-impact exercises; prefer low-impact alternatives (swimming, cycling)');
    notes.push('Warm up thoroughly before exercise');
    notes.push('Use proper joint protection techniques and consider resistance bands over heavy weights');
  }
  if (conditions.includes('injury')) {
    notes.push('Avoid movements that stress injured areas');
    notes.push('Work within pain-free ranges of motion');
    notes.push('Consider working with a physical therapist for rehabilitation exercises');
  }
  if (conditions.includes('asthma')) {
    notes.push('Keep rescue inhaler accessible during workouts');
    notes.push('Warm up gradually to prevent exercise-induced symptoms');
    notes.push('Avoid exercising outdoors when air quality is poor or during high pollen counts');
  }
  notes.push('Always prioritize safety and listen to your body');
  return notes;
}