// src/app.js
import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import corsOptions from "./config/cors.config.js";
import errorMiddleware from "./middlewares/error.middleware.js";

// Routes
import authRoutes            from "./routes/auth.routes.js";
import profileRoutes         from "./routes/profile.route.js";
import workoutRoutes         from "./routes/workout.routes.js";
import dashboardRoutes       from "./routes/dashboard.routes.js";
import planRoutes            from "./routes/plan.route.js";
import mealRoutes            from "./routes/meal.route.js";
import progressRoutes        from "./routes/progress.route.js";
import adminRoutes           from "./routes/admin.routes.js";
import aiCoachRoutes         from "./routes/ai.coach.routes.js";
import mealPlannerRoutes     from "./routes/meal.planner.routes.js";
import recommendationRoutes  from "./routes/smart.recommendation.routes.js";
import notificationRoutes    from "./routes/notification.routes.js";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

app.use("/api/auth",            authRoutes);
app.use("/api/profile",         profileRoutes);
app.use("/api/workouts",        workoutRoutes);
app.use("/api/dashboard",       dashboardRoutes);
app.use("/api/plans",           planRoutes);
app.use("/api/meals",           mealRoutes);
app.use("/api/progress",        progressRoutes);
app.use("/api/admin",           adminRoutes);
app.use("/api/ai",              aiCoachRoutes);
app.use("/api/meal-planner",    mealPlannerRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/notifications",   notificationRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://fitmitra-fyp.netlify.app");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(errorMiddleware);

export default app;