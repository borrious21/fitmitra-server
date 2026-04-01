// src/validators/progress.validator.js

export function validateProgressLog(data) {
  if (!data || typeof data !== "object") {
    const err = new Error("Progress log payload is missing or invalid");
    err.name = "ValidationError";
    err.details = ["Request body is empty or malformed"];
    throw err;
  }

  const errors = [];

  if (data.weight_kg !== undefined) {
    const v = Number(data.weight_kg);
    if (isNaN(v) || v < 20 || v > 300)
      errors.push("weight_kg must be between 20 and 300");
  }

  if (data.body_fat_percentage !== undefined) {
    const v = Number(data.body_fat_percentage);
    if (isNaN(v) || v < 0 || v > 100)
      errors.push("body_fat_percentage must be between 0 and 100");
  }

  if (data.energy_level !== undefined) {
    const v = Number(data.energy_level);
    if (!Number.isInteger(v) || v < 1 || v > 10)
      errors.push("energy_level must be an integer between 1 and 10");
  }

  if (data.sleep_hours !== undefined) {
    const v = Number(data.sleep_hours);
    if (isNaN(v) || v < 0 || v > 24)
      errors.push("sleep_hours must be between 0 and 24");
  }

  if (data.water_intake_liters !== undefined) {
    const v = Number(data.water_intake_liters);
    if (isNaN(v) || v < 0 || v > 20)
      errors.push("water_intake_liters must be between 0 and 20");
  }

  if (data.blood_pressure_systolic !== undefined) {
    const v = Number(data.blood_pressure_systolic);
    if (isNaN(v) || v < 60 || v > 250)
      errors.push("blood_pressure_systolic must be between 60 and 250 mmHg");
  }

  if (data.blood_pressure_diastolic !== undefined) {
    const v = Number(data.blood_pressure_diastolic);
    if (isNaN(v) || v < 40 || v > 150)
      errors.push("blood_pressure_diastolic must be between 40 and 150 mmHg");
  }

 const hasSys = data.blood_pressure_systolic !== undefined && data.blood_pressure_systolic !== null && data.blood_pressure_systolic !== "";
  const hasDia = data.blood_pressure_diastolic !== undefined && data.blood_pressure_diastolic !== null && data.blood_pressure_diastolic !== "";
  if (hasSys && !hasDia) errors.push("blood_pressure_diastolic is required when systolic is provided");
  if (hasDia && !hasSys) errors.push("blood_pressure_systolic is required when diastolic is provided");

 if (data.heart_rate !== undefined) {
    const v = Number(data.heart_rate);
    if (isNaN(v) || v < 30 || v > 250)
      errors.push("heart_rate must be between 30 and 250 bpm");
  }

 if (data.measurements !== undefined && (typeof data.measurements !== "object" || Array.isArray(data.measurements))) {
    errors.push("measurements must be an object");
  }

  if (data.progress_photos !== undefined && !Array.isArray(data.progress_photos)) {
    errors.push("progress_photos must be an array");
  }

  if (data.log_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.log_date))
      errors.push("log_date must be in YYYY-MM-DD format");
  }

  if (errors.length) {
    const err = new Error("Progress log validation failed");
    err.name    = "ValidationError";
    err.details = errors;
    throw err;
  }
}