



import pool from "../config/db.config.js";


async function fetchInsightData(userId) {
  const today     = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  const sevenAgo  = new Date(Date.now() - 7 * 86400000).toLocaleDateString("en-CA");

  const [
    profile,
    todayMeals,
    todayWorkout,
    nutritionPlan,
    recentWeightLogs,
    recentWorkoutLogs,
    progressLog,
  ] = await Promise.all([

    
    pool.query(
      `SELECT p.goal, p.weight_kg, p.activity_level, u.name
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId]
    ),

    
    pool.query(
      `SELECT
         COALESCE(SUM(calories_consumed), 0)::int AS calories,
         COALESCE(SUM(protein_g), 0)::float        AS protein_g,
         COUNT(*)::int                             AS meal_count
       FROM meal_logs
       WHERE user_id = $1 AND log_date = $2`,
      [userId, today]
    ),

    
    pool.query(
      `SELECT COUNT(DISTINCT workout_date)::int AS days_logged,
              MAX(workout_date)                 AS last_workout_date
       FROM workout_logs
       WHERE user_id = $1 AND workout_date >= $2`,
      [userId, sevenAgo]
    ),

    
    pool.query(
      `SELECT calorie_target, protein_g
       FROM nutrition_plans
       WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
      [userId]
    ),

    
    pool.query(
      `SELECT weight_kg, logged_date
       FROM weight_logs
       WHERE user_id = $1 AND logged_date >= $2
       ORDER BY logged_date DESC`,
      [userId, sevenAgo]
    ),

    
    pool.query(
      `SELECT MAX(workout_date) AS last_workout
       FROM workout_logs WHERE user_id = $1`,
      [userId]
    ),

    
    pool.query(
      `SELECT sleep_hours, water_intake_liters, energy_level
       FROM progress_logs
       WHERE user_id = $1 AND log_date = $2`,
      [userId, today]
    ),
  ]);

  return {
    profile:           profile.rows[0]          || null,
    todayMeals:        todayMeals.rows[0]        || { calories: 0, protein_g: 0, meal_count: 0 },
    workoutActivity:   todayWorkout.rows[0]      || { days_logged: 0, last_workout_date: null },
    nutritionPlan:     nutritionPlan.rows[0]     || null,
    weightLogs:        recentWeightLogs.rows     || [],
    lastWorkout:       recentWorkoutLogs.rows[0] || { last_workout: null },
    progressLog:       progressLog.rows[0]       || null,
    today,
    yesterday,
  };
}


function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}


export async function generateHealthInsights(userId) {
  const d = await fetchInsightData(userId);

  if (!d.profile) {
    return [{
      icon: "👤", color: "#f59e0b",
      message: "Complete your profile to unlock personalized health insights.",
      text: "Complete your profile to unlock personalized health insights.",
    }];
  }

  const insights    = [];
  const goal        = d.profile.goal ?? "maintenance";
  const name        = d.profile.name?.split(" ")[0] ?? "there";
  const calTarget   = Number(d.nutritionPlan?.calorie_target ?? 0);
  const protTarget  = Number(d.nutritionPlan?.protein_g      ?? 0);
  const calToday    = Number(d.todayMeals.calories);
  const protToday   = Number(d.todayMeals.protein_g);
  const mealCount   = Number(d.todayMeals.meal_count);
  const daysActive  = Number(d.workoutActivity.days_logged);
  const lastWODate  = d.lastWorkout.last_workout;
  const daysSinceWO = daysSince(lastWODate);

  
  if (daysSinceWO === null) {
    insights.push({
      icon: "💪", color: "#FF5C1A",
      message: `Welcome, ${name}! Log your first workout to start tracking progress.`,
      text: `Welcome, ${name}! Log your first workout to start tracking progress.`,
    });
  } else if (daysSinceWO === 0) {
    insights.push({
      icon: "🔥", color: "#10b981",
      message: `Great work! You trained today. Recovery and nutrition are key now.`,
      text: `Great work! You trained today. Recovery and nutrition are key now.`,
    });
  } else if (daysSinceWO === 1) {
    insights.push({
      icon: "✅", color: "#10b981",
      message: `You worked out yesterday. Rest days are part of the plan — stay active lightly today.`,
      text: `You worked out yesterday. Rest days are part of the plan — stay active lightly today.`,
    });
  } else if (daysSinceWO === 2) {
    insights.push({
      icon: "⚡", color: "#f59e0b",
      message: `It's been 2 days since your last workout. Today is a good day to get moving.`,
      text: `It's been 2 days since your last workout. Today is a good day to get moving.`,
    });
  } else if (daysSinceWO >= 3 && daysSinceWO < 7) {
    insights.push({
      icon: "⚠️", color: "#ef4444",
      message: `You haven't exercised in ${daysSinceWO} days. Consistency is key — even a 20-minute walk counts.`,
      text: `You haven't exercised in ${daysSinceWO} days. Consistency is key — even a 20-minute walk counts.`,
    });
  } else if (daysSinceWO >= 7) {
    insights.push({
      icon: "🚨", color: "#ef4444",
      message: `No workout logged in ${daysSinceWO} days. Your progress may stall — let's restart today!`,
      text: `No workout logged in ${daysSinceWO} days. Your progress may stall — let's restart today!`,
    });
  }

  
  if (calTarget > 0) {
    if (mealCount === 0) {
      insights.push({
        icon: "🍽️", color: "#f59e0b",
        message: `No meals logged today yet. Your target is ${calTarget.toLocaleString()} kcal — start logging to stay on track.`,
        text: `No meals logged today yet. Your target is ${calTarget.toLocaleString()} kcal — start logging to stay on track.`,
      });
    } else {
      const calPct = Math.round((calToday / calTarget) * 100);
      const remaining = calTarget - calToday;

      if (goal === "weight_loss" && calToday > calTarget * 1.1) {
        insights.push({
          icon: "📊", color: "#ef4444",
          message: `Calorie intake is ${calPct}% of your target — ${Math.abs(remaining).toLocaleString()} kcal over for weight loss. Consider lighter meals tonight.`,
          text: `Calorie intake is ${calPct}% of your target — ${Math.abs(remaining).toLocaleString()} kcal over for weight loss. Consider lighter meals tonight.`,
        });
      } else if (calToday < calTarget * 0.6 && mealCount < 3) {
        insights.push({
          icon: "⬇️", color: "#f59e0b",
          message: `Only ${calToday.toLocaleString()} kcal consumed so far — ${remaining.toLocaleString()} kcal left to reach your goal. Don't skip meals.`,
          text: `Only ${calToday.toLocaleString()} kcal consumed so far — ${remaining.toLocaleString()} kcal left to reach your goal. Don't skip meals.`,
        });
      } else if (calPct >= 90 && calPct <= 110) {
        insights.push({
          icon: "✅", color: "#10b981",
          message: `Nutrition on point! ${calToday.toLocaleString()} kcal consumed — ${calPct}% of your daily target. Keep it up.`,
          text: `Nutrition on point! ${calToday.toLocaleString()} kcal consumed — ${calPct}% of your daily target. Keep it up.`,
        });
      }
    }
  }

  
  if (protTarget > 0 && mealCount > 0) {
    const protPct = Math.round((protToday / protTarget) * 100);
    if (protPct < 50) {
      insights.push({
        icon: "🥩", color: "#FF5C1A",
        message: `Protein is only ${Math.round(protToday)}g so far (target: ${protTarget}g). Add eggs, dal, or chicken to your next meal.`,
        text: `Protein is only ${Math.round(protToday)}g so far (target: ${protTarget}g). Add eggs, dal, or chicken to your next meal.`,
      });
    } else if (protPct >= 90) {
      insights.push({
        icon: "💪", color: "#10b981",
        message: `Protein goal nearly hit — ${Math.round(protToday)}g of ${protTarget}g. Muscles are getting what they need!`,
        text: `Protein goal nearly hit — ${Math.round(protToday)}g of ${protTarget}g. Muscles are getting what they need!`,
      });
    }
  }

  
  if (d.weightLogs.length >= 3) {
    const first   = Number(d.weightLogs[d.weightLogs.length - 1].weight_kg);
    const latest  = Number(d.weightLogs[0].weight_kg);
    const change  = latest - first;
    const rounded = Math.round(Math.abs(change) * 10) / 10;

    if (goal === "weight_loss" && change < -0.3) {
      insights.push({
        icon: "📉", color: "#10b981",
        message: `You've lost ${rounded}kg this week. Great progress! Stay consistent with your deficit.`,
        text: `You've lost ${rounded}kg this week. Great progress! Stay consistent with your deficit.`,
      });
    } else if (goal === "weight_loss" && change > 0.2) {
      insights.push({
        icon: "📈", color: "#f59e0b",
        message: `Weight is up ${rounded}kg this week. Review your calorie intake — small adjustments add up.`,
        text: `Weight is up ${rounded}kg this week. Review your calorie intake — small adjustments add up.`,
      });
    } else if (goal === "muscle_gain" && change > 0.1) {
      insights.push({
        icon: "📈", color: "#10b981",
        message: `Gaining ${rounded}kg this week — on track for muscle growth. Keep lifting and eating well.`,
        text: `Gaining ${rounded}kg this week — on track for muscle growth. Keep lifting and eating well.`,
      });
    }
  } else if (d.weightLogs.length === 0) {
    insights.push({
      icon: "⚖️", color: "#64748b",
      message: `Log your weight daily for accurate progress tracking and better recommendations.`,
      text: `Log your weight daily for accurate progress tracking and better recommendations.`,
    });
  }

  
  if (d.progressLog?.sleep_hours != null) {
    const sleep = Number(d.progressLog.sleep_hours);
    if (sleep < 6) {
      insights.push({
        icon: "😴", color: "#8b5cf6",
        message: `Only ${sleep}h sleep last night. Recovery suffers below 7h — this can reduce workout performance and slow progress.`,
        text: `Only ${sleep}h sleep last night. Recovery suffers below 7h — this can reduce workout performance and slow progress.`,
      });
    } else if (sleep >= 7 && sleep <= 9) {
      insights.push({
        icon: "😴", color: "#10b981",
        message: `${sleep}h sleep — perfect recovery window. Your muscles repair and grow during deep sleep.`,
        text: `${sleep}h sleep — perfect recovery window. Your muscles repair and grow during deep sleep.`,
      });
    }
  }

  
  if (d.progressLog?.water_intake_liters != null) {
    const water = Number(d.progressLog.water_intake_liters);
    if (water < 1.5) {
      insights.push({
        icon: "💧", color: "#0ea5e9",
        message: `Only ${water}L water logged today. Aim for 2.5L+ — dehydration reduces energy and metabolism.`,
        text: `Only ${water}L water logged today. Aim for 2.5L+ — dehydration reduces energy and metabolism.`,
      });
    }
  }

  
  if (daysActive >= 5) {
    insights.push({
      icon: "🏆", color: "#10b981",
      message: `${daysActive} workout days this week — elite consistency! Your body is adapting fast.`,
      text: `${daysActive} workout days this week — elite consistency! Your body is adapting fast.`,
    });
  }

  
  if (insights.length === 0) {
    insights.push({
      icon: "✅", color: "#10b981",
      message: `Everything looks good today, ${name}! Keep logging consistently for better insights.`,
      text: `Everything looks good today, ${name}! Keep logging consistently for better insights.`,
    });
  }

  return insights.slice(0, 5); 
}