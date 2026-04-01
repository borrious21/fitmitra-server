// src/validators/workout.validator.js

export function validateWorkoutLog(data) {
  if (!data || typeof data !== 'object') {
    const err = new Error('Workout log payload is missing or invalid');
    err.name = 'ValidationError';
    err.details = ['Request body is empty or malformed'];
    throw err;
  }

  const errors = [];

  if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
    errors.push('exercises array is required and cannot be empty');
  } else {
    data.exercises.forEach((ex, index) => {
      const prefix = `exercises[${index}]`;

      if (!ex.name || typeof ex.name !== 'string' || !ex.name.trim())
        errors.push(`${prefix}.name is required and must be a non-empty string`);

      const sets = Number(ex.sets);
      if (ex.sets === undefined || ex.sets === null || isNaN(sets) || sets < 0 || Math.floor(sets) !== sets)
        errors.push(`${prefix}.sets must be a non-negative integer (got: ${ex.sets})`);

      const reps = Number(ex.reps);
      if (ex.reps === undefined || ex.reps === null || isNaN(reps) || reps < 0 || Math.floor(reps) !== reps)
        errors.push(`${prefix}.reps must be a non-negative integer (got: ${ex.reps})`);
      
      if (ex.weight !== undefined && ex.weight !== null) {
        const w = Number(ex.weight);
        if (isNaN(w) || w < 0)
          errors.push(`${prefix}.weight must be a non-negative number or null (got: ${ex.weight})`);
      }

      if (ex.notes !== undefined && ex.notes !== null && typeof ex.notes !== 'string')
        errors.push(`${prefix}.notes must be a string or null`);
    });
  }

  if (data.date !== undefined && data.date !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date))
      errors.push('date must be in YYYY-MM-DD format');
  }

  if (data.all_sets_completed !== undefined && data.all_sets_completed !== null) {
    if (typeof data.all_sets_completed !== 'boolean')
      errors.push('all_sets_completed must be a boolean');
  }

  if (data.rpe !== undefined && data.rpe !== null) {
    const rpe = Number(data.rpe);
    if (isNaN(rpe) || rpe < 1 || rpe > 10 || Math.floor(rpe) !== rpe)
      errors.push('rpe must be an integer between 1 and 10');
  }

  if (data.duration_minutes !== undefined && data.duration_minutes !== null) {
    const d = Number(data.duration_minutes);
    if (isNaN(d) || d < 0)
      errors.push('duration_minutes must be a non-negative number');
  }

  if (errors.length) {
    const err = new Error('Workout log validation failed: ' + errors[0]);
    err.name    = 'ValidationError';
    err.details = errors;
    throw err;
  }
}