import express from 'express';
import { generateInvoice, exportToExcel } from '../controllers/export.controller.js';
import { exportGSTR1 } from '../controllers/gstr1.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/invoice/:transactionId', generateInvoice);
router.get('/excel', exportToExcel);
router.get('/gstr1', exportGSTR1);

export default router;
