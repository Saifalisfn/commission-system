import express from 'express';
import { body } from 'express-validator';
import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { checkFilingLock } from '../middleware/filingLock.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const transactionValidation = [
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('totalReceived').isFloat({ min: 0.01 }).withMessage('Total received must be greater than 0'),
  body('commissionPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100'),
  body('paymentMode').optional().isIn(['QR']).withMessage('Payment mode must be QR'),
  body('remarks').optional().isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters')
];

// Routes
router.post('/', transactionValidation, validateRequest, createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.put('/:id', checkFilingLock, transactionValidation, validateRequest, updateTransaction);
router.delete('/:id', checkFilingLock, deleteTransaction);

export default router;
