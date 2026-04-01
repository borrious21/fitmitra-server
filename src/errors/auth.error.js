// src/errors/auth.error.js
class AuthError extends Error {
  constructor(message, statusCode = 401, code = null) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AuthError;