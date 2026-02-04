import GSTFilingLock from '../models/GSTFilingLock.model.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';

/**
 * Middleware to check if a transaction date is locked for editing
 * Prevents modifications after GST filing
 */
export const checkFilingLock = async (req, res, next) => {
  try {
    let transactionDate;

    // Get transaction date from request
    if (req.params.id) {
      // For update/delete operations, fetch the transaction first
      const Transaction = (await import('../models/Transaction.model.js')).default;
      const transaction = await Transaction.findById(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      transactionDate = transaction.date;
    } else if (req.body.date) {
      // For create operations, use date from body
      transactionDate = new Date(req.body.date);
    } else {
      // Default to current date
      transactionDate = new Date();
    }

    // Check if date is locked
    const isLocked = await GSTFilingLock.isDateLocked(transactionDate);

    if (isLocked) {
      const date = new Date(transactionDate);
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();

      // Log the attempt
      await GSTAuditLog.createLog({
        action: 'VALIDATION_FAILED',
        performedBy: req.user._id,
        entityType: 'TRANSACTION',
        entityId: req.params.id || null,
        period: {
          month: date.getMonth() + 1,
          year: date.getFullYear()
        },
        details: {
          reason: 'Filing lock check failed',
          operation: req.method,
          endpoint: req.path
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'FAILED',
        errorMessage: `Transaction for ${month} ${year} is locked due to GST filing`
      });

      return res.status(403).json({
        success: false,
        message: `Transactions for ${month} ${year} are locked due to GST filing. No modifications allowed.`,
        code: 'FILING_LOCKED'
      });
    }

    next();
  } catch (error) {
    console.error('Filing lock check error:', error);
    next(error);
  }
};

/**
 * Middleware to check if a period is locked (for bulk operations)
 * @param {String} period - Period in format 'YYYY-MM' or 'FYXX-MM'
 */
export const checkPeriodLock = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return next(); // Skip check if period not specified
    }

    const transactionDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const isLocked = await GSTFilingLock.isDateLocked(transactionDate);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: `Period ${month}/${year} is locked due to GST filing`,
        code: 'FILING_LOCKED'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
