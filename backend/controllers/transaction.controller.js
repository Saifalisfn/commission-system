import Transaction from '../models/Transaction.model.js';
import { calculateCommission, validateCalculations } from '../utils/calculateCommission.js';
import { generateInvoiceNumber, getFinancialYear } from '../utils/invoiceNumber.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';
import { validateTransactionForGST } from '../utils/gstValidation.js';
import XLSX from "xlsx";
import fs from "fs";

/* =========================================
   CREATE TRANSACTION
========================================= */
export const createTransaction = async (req, res, next) => {
  try {
    const { date, totalReceived, commissionPercent, paymentMode, remarks } = req.body;

    const commissionPercentValue =
      commissionPercent ?? parseFloat(process.env.DEFAULT_COMMISSION_PERCENT) ?? 1;

    const gstRate = parseFloat(process.env.GST_RATE) || 18;

    const calculations = calculateCommission(
      totalReceived,
      commissionPercentValue,
      gstRate
    );

    if (!validateCalculations(totalReceived, calculations)) {
      return res.status(400).json({
        success: false,
        message: 'Calculation validation failed'
      });
    }

    const transactionDate = date ? new Date(date) : new Date();

    const invoiceNumber = await generateInvoiceNumber(transactionDate);
    const financialYear = getFinancialYear(transactionDate);

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

    const transaction = await Transaction.create({
      date: transactionDate,
      totalReceived,
      commissionPercent: commissionPercentValue,
      ...calculations,
      paymentMode: paymentMode || 'QR',
      createdBy: req.user._id,
      remarks: remarks || '',
      invoiceNumber,
      financialYear
    });

    await transaction.populate('createdBy', 'name email');

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
        ...calculations
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

  } catch (err) {
    next(err);
  }
};

/* =========================================
   GET TRANSACTIONS
========================================= */
export const getTransactions = async (req, res, next) => {
  try {
    const { month, year, page = 1, limit = 50 } = req.query;

    const query = {};

    if (month && year) {
      query.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59)
      };
    } else if (year) {
      query.date = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59)
      };
    }

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

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
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summary[0] || {}
      }
    });

  } catch (err) {
    next(err);
  }
};

/* =========================================
   GET SINGLE
========================================= */
export const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!transaction)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: { transaction } });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   UPDATE TRANSACTION
========================================= */
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ success: false, message: "Not found" });

    const oldValues = {
      totalReceived: transaction.totalReceived,
      commissionAmount: transaction.commissionAmount,
      gstAmount: transaction.gstAmount
    };

    const total = req.body.totalReceived ?? transaction.totalReceived;
    const percent = req.body.commissionPercent ?? transaction.commissionPercent;

    const gstRate = parseFloat(process.env.GST_RATE) || 18;
    const calculations = calculateCommission(total, percent, gstRate);

    transaction.date = req.body.date ? new Date(req.body.date) : transaction.date;
    transaction.totalReceived = total;
    transaction.commissionPercent = percent;
    Object.assign(transaction, calculations);
    transaction.paymentMode = req.body.paymentMode ?? transaction.paymentMode;
    transaction.remarks = req.body.remarks ?? transaction.remarks;

    await transaction.save();

    await GSTAuditLog.createLog({
      action: 'TRANSACTION_UPDATED',
      performedBy: req.user._id,
      entityType: 'TRANSACTION',
      entityId: transaction._id,
      details: {
        oldValues,
        newValues: calculations
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      status: "SUCCESS"
    });

    res.json({ success: true, data: { transaction } });

  } catch (err) {
    next(err);
  }
};

/* =========================================
   DELETE
========================================= */
export const deleteTransaction = async (req,res,next)=>{
  try{
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({success:true,message:"Deleted"});
  }catch(err){ next(err); }
};

/* =========================================
   HELPERS
========================================= */

// Convert Excel serial date → real date
const excelDateToJSDate = (excelDate) => {
  if (typeof excelDate !== "number") return excelDate;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
};

// Validate headers
const validateHeaders = (row) => {
  const required = ["Date", "TotalReceived"];
  return required.every((key) => key in row);
};

/* =========================================
   UPLOAD EXCEL (DIRECT INSERT)
========================================= */
export const uploadSalesExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Excel file required" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length || !validateHeaders(data[0])) {
      return res.status(400).json({
        message:
          "Invalid Excel format. Required headers: Date, TotalReceived"
      });
    }

    const transactions = data.map((row) => {
      const total = Number(row.TotalReceived);
      const percent = Number(row.CommissionPercent || 1);

      const calculations = calculateCommission(
        total,
        percent,
        parseFloat(process.env.GST_RATE) || 18
      );

      return {
        date: row.Date
          ? new Date(excelDateToJSDate(row.Date))
          : new Date(),
        totalReceived: total,
        commissionPercent: percent,
        ...calculations,
        paymentMode: "QR",
        remarks: row.Remarks || "",
        createdBy: req.user._id
      };
    });

    await Transaction.insertMany(transactions);

    // delete uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      inserted: transactions.length
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);

    res.status(500).json({
      message: "Excel upload failed",
      error: err.message
    });
  }
};


/* =========================================
   EXCEL PREVIEW
========================================= */
export const previewSalesExcel = async (req, res) => {
  try {

    if (!req.file)
      return res.status(400).json({ message: "Excel required" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length || !validateHeaders(data[0])) {
      return res.status(400).json({
        message:
          "Invalid Excel format. Required headers: Date, TotalReceived"
      });
    }

    const preview = data.map((row, i) => {

      const total = Number(row.TotalReceived);
      const percent = Number(row.CommissionPercent || 1);

      const calculations = calculateCommission(
        total,
        percent,
        parseFloat(process.env.GST_RATE) || 18
      );

      return {
        row: i + 1,
        date: excelDateToJSDate(row.Date),
        totalReceived: total,
        commissionPercent: percent,
        ...calculations,
        remarks: row.Remarks || ""
      };
    });

    // delete file after preview
    fs.unlinkSync(req.file.path);

    res.json({ success: true, preview });

  } catch (err) {

    console.error("PREVIEW ERROR:", err);

    res.status(500).json({
      message: "Preview failed",
      error: err.message
    });
  }
};


/* =========================================
   CONFIRM EXCEL IMPORT
========================================= */
export const confirmExcelImport = async (req, res) => {
  try {

    await Transaction.insertMany(
      req.body.transactions.map((t) => ({
        ...t,
        createdBy: req.user._id,
        paymentMode: "QR"
      }))
    );

    res.json({ success: true });

  } catch (err) {
    console.error("CONFIRM ERROR:", err);

    res.status(500).json({
      message: "Import failed"
    });
  }
};
