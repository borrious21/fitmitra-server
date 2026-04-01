// validators/admin/meal.validator.js
const VALID_DIET_TYPES = ["veg", "non_veg", "eggetarian"];

export const validateMeal = (body, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!body.name || typeof body.name !== "string" || !body.name.trim())
      errors.push("name is required");
    if (body.calories === undefined || body.calories === null)
      errors.push("calories is required");
  }

  if (body.calories !== undefined && (isNaN(Number(body.calories)) || Number(body.calories) < 0))
    errors.push("calories must be a non-negative number");

  if (body.diet_type !== undefined && !VALID_DIET_TYPES.includes(body.diet_type))
    errors.push(`diet_type must be one of: ${VALID_DIET_TYPES.join(", ")}`);

  if (body.macros !== undefined) {
    if (typeof body.macros !== "object" || Array.isArray(body.macros) || body.macros === null)
      errors.push("macros must be a JSON object e.g. { \"protein_g\": 20, \"carbs_g\": 30, \"fats_g\": 10 }");
  }

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.name    = "ValidationError";
    err.details = errors;
    throw err;
  }
};