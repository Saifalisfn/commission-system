import Transaction from '../models/Transaction.model.js';
import { validateGSTCompliance, filterForGSTReporting } from '../utils/gstValidation.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';
import { getFinancialYear } from '../utils/invoiceNumber.js';

/**
 * Get GST Summary Report
 * GET /api/v1/reports/gst?month=&year=
 * 
 * Returns GST-compliant summary ready for GSTR-1 & GSTR-3B filing
 */
export const getGSTSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    // Build date query
    const query = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get transactions for validation
    const allTransactions = await Transaction.find(query);
    
    // Validate GST compliance - ensure only commission income
    const validation = validateGSTCompliance(allTransactions);
    
    if (!validation.isValid) {
      // Log validation failure
      const financialYear = allTransactions.length > 0 
        ? getFinancialYear(allTransactions[0].date) 
        : getFinancialYear(new Date());
      
      await GSTAuditLog.createLog({
        action: 'VALIDATION_FAILED',
        performedBy: req.user._id,
        entityType: 'REPORT',
        period: {
          financialYear,
          month: month ? parseInt(month) : null,
          year: year ? parseInt(year) : null
        },
        details: {
          reason: 'GST compliance validation failed',
          errors: validation.errors
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'FAILED',
        errorMessage: 'Transactions failed GST compliance validation'
      });

      return res.status(400).json({
        success: false,
        message: 'GST compliance validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Aggregate GST data
    const gstSummary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalCommission: { $sum: '$commissionAmount' },
          totalGST: { $sum: '$gstAmount' },
          totalNetIncome: { $sum: '$netIncome' },
          transactionCount: { $sum: 1 },
          // For GSTR-1: Outward supplies (commission is taxable supply)
          taxableValue: { $sum: '$commissionAmount' },
          // GST breakdown (assuming 18% GST)
          cgst: { $sum: { $divide: ['$gstAmount', 2] } },
          sgst: { $sum: { $divide: ['$gstAmount', 2] } },
          igst: { $sum: 0 } // Set to 0 for intra-state, adjust if inter-state
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    // Calculate totals
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalGST: { $sum: '$gstAmount' },
          totalNetIncome: { $sum: '$netIncome' },
          totalTransactions: { $sum: 1 },
          taxableValue: { $sum: '$commissionAmount' },
          cgst: { $sum: { $divide: ['$gstAmount', 2] } },
          sgst: { $sum: { $divide: ['$gstAmount', 2] } }
        }
      }
    ]);

    // Create audit log for report generation
    const financialYear = allTransactions.length > 0 
      ? getFinancialYear(allTransactions[0].date) 
      : getFinancialYear(new Date());
    
    await GSTAuditLog.createLog({
      action: 'REPORT_GENERATED',
      performedBy: req.user._id,
      entityType: 'REPORT',
      period: {
        financialYear,
        month: month ? parseInt(month) : null,
        year: year ? parseInt(year) : null
      },
      details: {
        reportType: 'GST_SUMMARY',
        transactionCount: totals[0]?.totalTransactions || 0,
        totalTaxableValue: totals[0]?.taxableValue || 0,
        totalGST: totals[0]?.totalGST || 0
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      data: {
        summary: gstSummary,
        totals: totals[0] || {
          totalCommission: 0,
          totalGST: 0,
          totalNetIncome: 0,
          totalTransactions: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0
        },
        gstRate: parseFloat(process.env.GST_RATE) || 18,
        period: month && year ? `${year}-${String(month).padStart(2, '0')}` : year || 'All',
        validation: {
          isValid: true,
          warnings: validation.warnings
        }
      },
      notes: [
        'GST applies ONLY on commission amount (not on totalReceived)',
        'CGST and SGST are calculated as 50% each of total GST (for intra-state transactions)',
        'This summary is ready for GSTR-1 and GSTR-3B filing',
        'Total Received amount is NOT included in taxable value (it is not revenue)',
        'Only commission income is included in GST calculations'
      ]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly summary
 * GET /api/v1/reports/monthly?year=
 */
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { year } = req.query;
    const yearValue = year ? parseInt(year) : new Date().getFullYear();

    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(yearValue, 0, 1),
            $lte: new Date(yearValue, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalReceived: { $sum: '$totalReceived' },
          totalCommission: { $sum: '$commissionAmount' },
          totalGST: { $sum: '$gstAmount' },
          totalNetIncome: { $sum: '$netIncome' },
          totalReturn: { $sum: '$returnAmount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        year: yearValue,
        monthlySummary: summary
      }
    });
  } catch (error) {
    next(error);
  }
};
