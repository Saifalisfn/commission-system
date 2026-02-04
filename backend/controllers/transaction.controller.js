import Transaction from '../models/Transaction.model.js';
import { calculateCommission, validateCalculations } from '../utils/calculateCommission.js';
import { generateInvoiceNumber, getFinancialYear } from '../utils/invoiceNumber.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';
import { validateTransactionForGST } from '../utils/gstValidation.js';

/**
 * Create a new transaction
 * POST /api/v1/transactions
 * 
 * CRITICAL: All calculations are done server-side to ensure GST compliance
 */
export const createTransaction = async (req, res, next) => {
  try {
    const { date, totalReceived, commissionPercent, paymentMode, remarks } = req.body;

    // Use default commission percent if not provided
    const commissionPercentValue = commissionPercent || parseFloat(process.env.DEFAULT_COMMISSION_PERCENT) || 1;
    const gstRate = parseFloat(process.env.GST_RATE) || 18;

    // Calculate commission, GST, net income, and return amount
    const calculations = calculateCommission(totalReceived, commissionPercentValue, gstRate);

    // Validate calculations
    if (!validateCalculations(totalReceived, calculations)) {
      return res.status(400).json({
        success: false,
        message: 'Calculation validation failed'
      });
    }

    // Generate invoice number and financial year
    const transactionDate = date ? new Date(date) : new Date();
    const invoiceNumber = await generateInvoiceNumber(transactionDate);
    const financialYear = getFinancialYear(transactionDate);

    // Validate transaction for GST compliance
    const gstValidation = validateTransactionForGST({
      commissionAmount: calculations.commissionAmount,
      gstAmount: calculations.gstAmount,
      totalReceived
    });

    if (!gstValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'GST validation failed',
        errors: gstValidation.errors
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      date: transactionDate,
      totalReceived,
      commissionPercent: commissionPercentValue,
      commissionAmount: calculations.commissionAmount,
      gstAmount: calculations.gstAmount,
      netIncome: calculations.netIncome,
      returnAmount: calculations.returnAmount,
      paymentMode: paymentMode || 'QR',
      createdBy: req.user._id,
      remarks: remarks || '',
      invoiceNumber,
      financialYear
    });

    // Populate creator info
    await transaction.populate('createdBy', 'name email');

    // Create audit log
    await GSTAuditLog.createLog({
      action: 'TRANSACTION_CREATED',
      performedBy: req.user._id,
      entityType: 'TRANSACTION',
      entityId: transaction._id,
      period: {
        financialYear,
        month: transactionDate.getMonth() + 1,
        year: transactionDate.getFullYear()
      },
      details: {
        invoiceNumber,
        totalReceived,
        commissionAmount: calculations.commissionAmount,
        gstAmount: calculations.gstAmount,
        netIncome: calculations.netIncome
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions with optional filters
 * GET /api/v1/transactions?month=&year=&page=&limit=
 */
export const getTransactions = async (req, res, next) => {
  try {
    const { month, year, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Transaction.countDocuments(query);

    // Calculate summary
    const summary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: '$totalReceived' },
          totalCommission: { $sum: '$commissionAmount' },
          totalGST: { $sum: '$gstAmount' },
          totalNetIncome: { $sum: '$netIncome' },
          totalReturn: { $sum: '$returnAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: summary[0] || {
          totalReceived: 0,
          totalCommission: 0,
          totalGST: 0,
          totalNetIncome: 0,
          totalReturn: 0,
          count: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single transaction by ID
 * GET /api/v1/transactions/:id
 */
export const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a transaction
 * PUT /api/v1/transactions/:id
 */
export const updateTransaction = async (req, res, next) => {
  try {
    const { date, totalReceived, commissionPercent, paymentMode, remarks } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Recalculate if amount or commission percent changed
    let calculations = {
      commissionAmount: transaction.commissionAmount,
      gstAmount: transaction.gstAmount,
      netIncome: transaction.netIncome,
      returnAmount: transaction.returnAmount
    };

    if (totalReceived || commissionPercent !== undefined) {
      const totalReceivedValue = totalReceived || transaction.totalReceived;
      const commissionPercentValue = commissionPercent !== undefined ? commissionPercent : transaction.commissionPercent;
      const gstRate = parseFloat(process.env.GST_RATE) || 18;

      calculations = calculateCommission(totalReceivedValue, commissionPercentValue, gstRate);
    }

    // Update transaction
    transaction.date = date ? new Date(date) : transaction.date;
    transaction.totalReceived = totalReceived || transaction.totalReceived;
    transaction.commissionPercent = commissionPercent !== undefined ? commissionPercent : transaction.commissionPercent;
    transaction.commissionAmount = calculations.commissionAmount;
    transaction.gstAmount = calculations.gstAmount;
    transaction.netIncome = calculations.netIncome;
    transaction.returnAmount = calculations.returnAmount;
    transaction.paymentMode = paymentMode || transaction.paymentMode;
    transaction.remarks = remarks !== undefined ? remarks : transaction.remarks;

    await transaction.save();
    await transaction.populate('createdBy', 'name email');

    // Create audit log
    const transactionDate = transaction.date;
    await GSTAuditLog.createLog({
      action: 'TRANSACTION_UPDATED',
      performedBy: req.user._id,
      entityType: 'TRANSACTION',
      entityId: transaction._id,
      period: {
        financialYear: transaction.financialYear,
        month: transactionDate.getMonth() + 1,
        year: transactionDate.getFullYear()
      },
      details: {
        invoiceNumber: transaction.invoiceNumber,
        oldValues,
        newValues: {
          totalReceived: transaction.totalReceived,
          commissionAmount: transaction.commissionAmount,
          gstAmount: transaction.gstAmount
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a transaction
 * DELETE /api/v1/transactions/:id
 */
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transactionData = {
      invoiceNumber: transaction.invoiceNumber,
      date: transaction.date,
      totalReceived: transaction.totalReceived,
      commissionAmount: transaction.commissionAmount
    };

    await Transaction.findByIdAndDelete(req.params.id);

    // Create audit log
    const transactionDate = transaction.date;
    await GSTAuditLog.createLog({
      action: 'TRANSACTION_DELETED',
      performedBy: req.user._id,
      entityType: 'TRANSACTION',
      entityId: req.params.id,
      period: {
        financialYear: transaction.financialYear,
        month: transactionDate.getMonth() + 1,
        year: transactionDate.getFullYear()
      },
      details: transactionData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
