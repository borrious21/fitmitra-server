// src/config/jwt.config.js

export const jwtSecret = process.env.JWT_SECRET;
export const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
export const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

if (!jwtSecret) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

if (!jwtRefreshSecret) {
  throw new Error("Missing JWT_REFRESH_SECRET in environment variables");
}
