import express from "express";
import authenticateToken from "../middlewares/auth.middleware.js";
import {
  getExercises,
  getExerciseById,
  getCategories,
  logSession,
  getSessions,
  deleteSession,
  logMood,
  getMoodHistory,
  deleteMoodLog,
  logStress,
  getStressHistory,
  deleteStressLog,
  addJournalEntry,
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  getWellnessSummary
} from "../controllers/User/wellness.controller.js";

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', getWellnessSummary);

router.get('/categories', getCategories);

router.get('/exercises', getExercises);
router.get('/exercises/:id', getExerciseById);

router.get('/sessions', getSessions);
router.post('/sessions', logSession);
router.delete('/sessions/:id', deleteSession);

router.get('/mood', getMoodHistory);
router.post('/mood', logMood);
router.delete('/mood/:id', deleteMoodLog);

router.get('/stress', getStressHistory);
router.post('/stress', logStress);
router.delete('/stress/:id', deleteStressLog);

router.get('/journal', getJournalEntries);
router.post('/journal', addJournalEntry);
router.put('/journal/:id', updateJournalEntry);
router.delete('/journal/:id', deleteJournalEntry);

export default router;