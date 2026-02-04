import Transaction from '../models/Transaction.model.js';
import { validateGSTCompliance, filterForGSTReporting } from '../utils/gstValidation.js';
import GSTAuditLog from '../models/GSTAuditLog.model.js';
import { getFinancialYear } from '../utils/invoiceNumber.js';

/**
 * Generate GSTR-1 JSON Export
 * GET /api/v1/export/gstr1?month=&year=
 * 
 * Returns GSTR-1 compliant JSON structure
 * CRITICAL: Only commission income is included (NOT totalReceived)
 */
export const exportGSTR1 = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Build date query
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    // Get transactions
    const transactions = await Transaction.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1, invoiceNumber: 1 });

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for the selected period'
      });
    }

    // Validate GST compliance
    const validation = validateGSTCompliance(transactions);
    
    if (!validation.isValid) {
      // Log validation failure
      await GSTAuditLog.createLog({
        action: 'VALIDATION_FAILED',
        performedBy: req.user._id,
        entityType: 'REPORT',
        period: {
          financialYear: getFinancialYear(startDate),
          month: parseInt(month),
          year: parseInt(year)
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

    // Filter for GST reporting (only commission income)
    const gstData = filterForGSTReporting(transactions);

    // Build GSTR-1 JSON structure
    const financialYear = getFinancialYear(startDate);
    const gstr1Data = {
      version: "GST3.3",
      gstin: process.env.COMPANY_GSTIN || "",
      ret_period: `${year}${String(month).padStart(2, '0')}`, // Format: YYYYMM
      b2b: [], // B2B invoices (if applicable)
      b2cl: [], // B2C Large invoices (if applicable)
      b2cs: [], // B2C Small invoices
      cdnr: [], // Credit/Debit Notes
      cdnur: [], // Credit/Debit Notes (Unregistered)
      exp: [], // Exports
      at: [], // Advance Tax
      atadj: [], // Advance Tax Adjustments
      hsn: [], // HSN Summary
      doc_issue: [] // Document Issue
    };

    // Build B2CS (B2C Small) entries - Commission invoices
    // Format as per GSTR-1 specification
    gstData.forEach((item, index) => {
      const transaction = transactions[index];
      const transactionDate = new Date(transaction.date);
      
      // B2CS entry (B2C Small - Commission Income)
      gstr1Data.b2cs.push({
        typ: "OE", // Type: Outward Exempted (if applicable) or "OE" for regular
        pos: process.env.COMPANY_STATE_CODE || "29", // Place of Supply (State Code)
        etin: "", // e-Tax Invoice Number (if applicable)
        rt: 18.00, // Tax Rate
        txval: parseFloat(item.taxableValue.toFixed(2)), // Taxable Value (ONLY commission)
        iamt: parseFloat(item.cgst.toFixed(2)), // Integrated Tax (IGST) - 0 for intra-state
        camt: parseFloat(item.cgst.toFixed(2)), // Central Tax (CGST)
        samt: parseFloat(item.sgst.toFixed(2)), // State Tax (SGST)
        csamt: 0 // Cess Amount
      });

      // HSN Summary Entry
      const hsnCode = process.env.HSN_CODE || "998314"; // Service HSN code for commission
      const existingHsn = gstr1Data.hsn.find(h => h.hsn_sc === hsnCode && h.rt === 18.00);
      
      if (existingHsn) {
        existingHsn.qty += 1;
        existingHsn.rt = 18.00;
        existingHsn.txval += parseFloat(item.taxableValue.toFixed(2));
        existingHsn.iamt += 0; // IGST
        existingHsn.camt += parseFloat(item.cgst.toFixed(2));
        existingHsn.samt += parseFloat(item.sgst.toFixed(2));
        existingHsn.csamt += 0;
      } else {
        gstr1Data.hsn.push({
          hsn_sc: hsnCode,
          desc: "Commission Income",
          uqc: "NOS", // Unit of Quantity Code
          qty: 1,
          rt: 18.00,
          txval: parseFloat(item.taxableValue.toFixed(2)),
          iamt: 0, // IGST (0 for intra-state)
          camt: parseFloat(item.cgst.toFixed(2)),
          samt: parseFloat(item.sgst.toFixed(2)),
          csamt: 0
        });
      }
    });

    // Document Issue Summary
    gstr1Data.doc_issue.push({
      doc_num: transactions.length,
      doc_typ: "INV", // Invoice
      totnum: transactions.length
    });

    // Create audit log
    await GSTAuditLog.createLog({
      action: 'GSTR1_EXPORTED',
      performedBy: req.user._id,
      entityType: 'EXPORT',
      period: {
        financialYear,
        month: parseInt(month),
        year: parseInt(year),
        filingPeriod: `${financialYear}-${String(month).padStart(2, '0')}`
      },
      details: {
        transactionCount: transactions.length,
        totalTaxableValue: gstData.reduce((sum, item) => sum + item.taxableValue, 0),
        totalGST: gstData.reduce((sum, item) => sum + item.totalGST, 0),
        validation: validation.summary
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'GSTR-1 data exported successfully',
      data: {
        gstr1: gstr1Data,
        summary: {
          period: `${year}-${String(month).padStart(2, '0')}`,
          financialYear,
          totalInvoices: transactions.length,
          totalTaxableValue: gstData.reduce((sum, item) => sum + item.taxableValue, 0),
          totalCGST: gstData.reduce((sum, item) => sum + item.cgst, 0),
          totalSGST: gstData.reduce((sum, item) => sum + item.sgst, 0),
          totalGST: gstData.reduce((sum, item) => sum + item.totalGST, 0)
        },
        validation: {
          isValid: true,
          warnings: validation.warnings
        },
        notes: [
          'Only commission income is included in taxable value',
          'Total received amount is NOT included (it is not revenue)',
          'GST applies ONLY on commission amount',
          'This data is ready for GSTR-1 filing'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};
