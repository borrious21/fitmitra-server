// admin/validators/userValidator.js

export const validateUserUpdate = (body) => {
  const errors = [];

  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push("Invalid email format");
    }
  }

  if (body.role !== undefined && !["user", "admin"].includes(body.role)) {
    errors.push("role must be 'user' or 'admin'");
  }

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.name = "ValidationError";
    err.details = errors;
    throw err;
  }
};