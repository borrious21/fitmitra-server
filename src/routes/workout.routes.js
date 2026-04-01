// src/routes/workout.routes.js

import { Router }         from 'express';
import WorkoutController  from '../controllers/User/workout.controller.js';
import authMiddleware     from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// POST /api/workouts/log
router.post('/log', WorkoutController.logWorkout);

// POST /api/workouts/feedback
router.post('/feedback', WorkoutController.submitFeedback);

// GET /api/workouts/today
router.get('/today', WorkoutController.getTodayWorkout);

// GET /api/workouts/date?date=YYYY-MM-DD
router.get('/date', WorkoutController.getWorkoutByDate);

// GET /api/workouts/weekly
router.get('/weekly', WorkoutController.getWeeklyPlan);

// POST /api/workouts/advance-week  (typically cron — also callable by admin)
router.post('/advance-week', WorkoutController.advanceMesocycleWeek);

// GET /api/workouts/history?limit=30&offset=0&startDate=&endDate=&completedOnly=true
router.get('/history', WorkoutController.getWorkoutHistory);

// GET /api/workouts/stats?days=30
router.get('/stats', WorkoutController.getWorkoutStats);

// GET /api/workouts/streak
router.get('/streak', WorkoutController.getStreak);

// GET /api/workouts/insights
router.get('/insights', WorkoutController.getInsights);

// GET /api/workouts/dashboard?days=30
router.get('/dashboard', WorkoutController.getDashboard);

// GET /api/workouts/prs
router.get('/prs', WorkoutController.getPersonalRecords);

// GET /api/workouts/volume?days=30
router.get('/volume', WorkoutController.getVolumeStats);

// POST /api/workouts/adapt-nutrition
router.post('/adapt-nutrition', WorkoutController.adaptNutrition);

// GET /api/workouts/achievements
router.get('/achievements', WorkoutController.getAchievements);

// DELETE /api/workouts/log/:id
router.delete('/log/:id', WorkoutController.deleteWorkout);

export default router;