import express from 'express';
import { getGSTSummary, getMonthlySummary } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/gst', getGSTSummary);
router.get('/monthly', getMonthlySummary);

export default router;
