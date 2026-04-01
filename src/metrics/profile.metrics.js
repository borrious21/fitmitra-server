import { ACTIVITY_MULTIPLIERS } from "../domain/profile.enum.js";

export function withMetrics(profile) {
  if (!profile.height_cm || !profile.weight_kg || !profile.age) {
    return { ...profile, bmi: null, bmr: null, tdee: null };
  }

  const heightM = profile.height_cm / 100;
  const bmi = profile.weight_kg / (heightM ** 2);

  let bmr;
  if (profile.gender === "male") {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
  } else if (profile.gender === "female") {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
  } else {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 78;
  }

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[profile.activity_level] || 1.2);

  return {
    ...profile,
    bmi: +bmi.toFixed(2),
    bmr: +bmr.toFixed(2),
    tdee: +tdee.toFixed(2),
  };
}
