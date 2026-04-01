import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Slow down." },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    req.user?.id?.toString() || ipKeyGenerator(req), 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "AI rate limit reached. Wait a moment before sending more messages.",
  },
});