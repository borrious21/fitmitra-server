// validators/admin/exercise.validator.js
const VALID_MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "legs", "core", "cardio", "full_body",
];

const VALID_DIFFICULTY = ["beginner", "intermediate", "advanced"];

export const validateExercise = (body, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!body.name || typeof body.name !== "string" || !body.name.trim())
      errors.push("name is required");
    if (!body.muscle_group)
      errors.push("muscle_group is required");
  }

  if (body.muscle_group !== undefined && !VALID_MUSCLE_GROUPS.includes(body.muscle_group))
    errors.push(`muscle_group must be one of: ${VALID_MUSCLE_GROUPS.join(", ")}`);

  if (body.difficulty !== undefined && !VALID_DIFFICULTY.includes(body.difficulty))
    errors.push(`difficulty must be one of: ${VALID_DIFFICULTY.join(", ")}`);

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.name    = "ValidationError";
    err.details = errors;
    throw err;
  }
};