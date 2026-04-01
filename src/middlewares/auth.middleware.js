// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import AuthError from "../errors/auth.error.js";
import { jwtSecret } from "../config/jwt.config.js";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AuthError("Authorization denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AuthError("Session expired. Please login again.", 401);
      }
      throw new AuthError("Invalid token.", 401);
    }

    const user = await UserModel.findById(decoded.id);

    if (!user) {
      throw new AuthError("User not found.", 401);
    }

    if (!user.is_active) {
      throw new AuthError("Account is deactivated.", 403);
    }
 
    const { password_hash, ...safeUser } = user;
    req.user = safeUser; 

    next();
  } catch (error) {
    next(error);
  }
};

export const requireVerified = (req, res, next) => {
  if (!req.user?.is_verified) {
    return next(
      new AuthError("Please verify your email to access this resource.", 403)
    );
  }
  next();
};

export default authenticate;