import {
  GOALS,
  ACTIVITY_LEVELS,
  GENDERS,
  DIET_TYPES,
} from "../domain/profile.enum.js";

export function validateProfile(data, isCreate = false) {
  if (!data || typeof data !== "object") {
    const err = new Error("Profile payload is missing or invalid");
    err.name = "ValidationError";
    err.details = ["Request body is empty or malformed"];
    throw err;
  }

  const errors = [];

  if (isCreate) {
    [
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "goal",
      "activity_level",
      "diet_type",
    ].forEach((field) => {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        errors.push(`${field} is required`);
      }
    });
  }

  if (data.age !== undefined && (!Number.isInteger(data.age) || data.age < 13 || data.age > 120)) {
    errors.push("Age must be between 13 and 120");
  }

  if (data.height_cm !== undefined && (data.height_cm < 100 || data.height_cm > 250)) {
    errors.push("Height must be between 100 and 250 cm");
  }

  if (data.weight_kg !== undefined && (data.weight_kg < 30 || data.weight_kg > 300)) {
    errors.push("Weight must be between 30 and 300 kg");
  }

  if (data.gender && !GENDERS.includes(data.gender.toLowerCase())) {
    errors.push(`Invalid gender: ${GENDERS.join(", ")}`);
  }

  if (data.goal && !GOALS.includes(data.goal)) {
    errors.push(`Invalid goal: ${GOALS.join(", ")}`);
  }

  if (data.activity_level && !ACTIVITY_LEVELS.includes(data.activity_level)) {
    errors.push(`Invalid activity level`);
  }

  if (data.diet_type && !DIET_TYPES.includes(data.diet_type)) {
    errors.push(`Invalid diet type`);
  }

  if (
    data.medical_conditions !== undefined &&
    (typeof data.medical_conditions !== "object" || Array.isArray(data.medical_conditions))
  ) {
    errors.push("medical_conditions must be an object");
  }

  if (errors.length) {
    const err = new Error("Validation failed");
    err.name = "ValidationError";
    err.details = errors;
    throw err;
  }
}
