// src/middlewares/admin.middleware.js

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
      code: "FORBIDDEN",
    });
  }

  next();
};

export default adminMiddleware;