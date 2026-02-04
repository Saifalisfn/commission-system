import GSTFilingLock from '../models/GSTFilingLock.model.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';
import { getFinancialYear } from '../utils/invoiceNumber.js';

/**
 * Lock a month for GST filing
 * POST /api/v1/filing-locks
 */
export const lockMonth = async (req, res, next) => {
  try {
    const { month, year, gstr1FilingDate, gstr3BFilingDate, remarks } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Check if already locked
    const transactionDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const isLocked = await GSTFilingLock.isDateLocked(transactionDate);

    if (isLocked) {
      return res.status(400).json({
        success: false,
        message: `Month ${month}/${year} is already locked`
      });
    }

    // Lock the month
    const lock = await GSTFilingLock.lockMonth(
      parseInt(month),
      parseInt(year),
      req.user._id,
      {
        gstr1FilingDate: gstr1FilingDate ? new Date(gstr1FilingDate) : null,
        gstr3BFilingDate: gstr3BFilingDate ? new Date(gstr3BFilingDate) : null,
        remarks: remarks || ''
      }
    );

    // Create audit log
    await GSTAuditLog.createLog({
      action: 'FILING_LOCKED',
      performedBy: req.user._id,
      entityType: 'FILING_LOCK',
      entityId: lock._id,
      period: {
        financialYear: lock.financialYear,
        month: parseInt(month),
        year: parseInt(year),
        filingPeriod: lock.filingPeriod
      },
      details: {
        month: parseInt(month),
        year: parseInt(year),
        gstr1FilingDate: lock.gstr1FilingDate,
        gstr3BFilingDate: lock.gstr3BFilingDate,
        remarks: lock.remarks
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.status(201).json({
      success: true,
      message: `Month ${month}/${year} locked successfully`,
      data: { lock }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlock a month (admin only, for corrections)
 * DELETE /api/v1/filing-locks/:month/:year
 */
export const unlockMonth = async (req, res, next) => {
  try {
    const { month, year } = req.params;

    const lock = await GSTFilingLock.unlockMonth(parseInt(month), parseInt(year));

    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Filing lock not found'
      });
    }

    // Create audit log
    await GSTAuditLog.createLog({
      action: 'FILING_UNLOCKED',
      performedBy: req.user._id,
      entityType: 'FILING_LOCK',
      entityId: lock._id,
      period: {
        financialYear: lock.financialYear,
        month: parseInt(month),
        year: parseInt(year),
        filingPeriod: lock.filingPeriod
      },
      details: {
        reason: 'Manual unlock',
        unlockedBy: req.user.email
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: `Month ${month}/${year} unlocked successfully`,
      data: { lock }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all filing locks
 * GET /api/v1/filing-locks
 */
export const getFilingLocks = async (req, res, next) => {
  try {
    const { year } = req.query;

    const query = {};
    if (year) {
      query.year = parseInt(year);
    }

    const locks = await GSTFilingLock.find(query)
      .populate('lockedBy', 'name email')
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      data: { locks }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get filing lock status for a specific month
 * GET /api/v1/filing-locks/:month/:year
 */
export const getFilingLockStatus = async (req, res, next) => {
  try {
    const { month, year } = req.params;

    const transactionDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const isLocked = await GSTFilingLock.isDateLocked(transactionDate);

    const lock = await GSTFilingLock.findOne({
      month: parseInt(month),
      year: parseInt(year)
    }).populate('lockedBy', 'name email');

    res.json({
      success: true,
      data: {
        isLocked,
        lock: lock || null
      }
    });
  } catch (error) {
    next(error);
  }
};
