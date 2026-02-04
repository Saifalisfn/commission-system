import express from 'express';
import { body } from 'express-validator';
import {
  lockMonth,
  unlockMonth,
  getFilingLocks,
  getFilingLockStatus
} from '../controllers/filingLock.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const lockValidation = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be valid'),
  body('gstr1FilingDate').optional().isISO8601().withMessage('Invalid GSTR-1 filing date'),
  body('gstr3BFilingDate').optional().isISO8601().withMessage('Invalid GSTR-3B filing date'),
  body('remarks').optional().isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters')
];

// Routes
router.post('/', lockValidation, validateRequest, lockMonth);
router.get('/', getFilingLocks);
router.get('/:month/:year', getFilingLockStatus);
router.delete('/:month/:year', authorize('admin'), unlockMonth); // Only admin can unlock

export default router;
