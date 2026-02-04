import Transaction from '../models/Transaction.model.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

/**
 * Generate GST-compliant invoice PDF
 * GET /api/v1/export/invoice/:transactionId
 */
export const generateInvoice = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('createdBy', 'name email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Company details from environment
    const companyName = process.env.COMPANY_NAME || 'Your Company Name';
    const companyAddress = process.env.COMPANY_ADDRESS || 'Your Company Address';
    const companyGSTIN = process.env.COMPANY_GSTIN || '29XXXXXXXXXX1Z5';
    const companyPAN = process.env.COMPANY_PAN || 'XXXXXXXXXX';

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${transaction._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    // Company details
    doc.fontSize(12).text(companyName, { align: 'left' });
    doc.fontSize(10).text(companyAddress);
    doc.text(`GSTIN: ${companyGSTIN}`);
    doc.text(`PAN: ${companyPAN}`);
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    const invoiceNumber = transaction.invoiceNumber || `INV-${transaction._id.toString().substring(0, 8).toUpperCase()}`;
    doc.text(`Invoice No: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${transaction.date.toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    // Line separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Transaction details
    doc.fontSize(12).text('Transaction Details:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Payment Mode: ${transaction.paymentMode}`);
    doc.text(`Created By: ${transaction.createdBy.name} (${transaction.createdBy.email})`);
    doc.moveDown();

    // Invoice table header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Amount (₹)', 400, tableTop, { align: 'right' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Invoice items
    doc.font('Helvetica');
    doc.text('Commission Income', 50);
    doc.text(transaction.commissionAmount.toFixed(2), 400, doc.y - 15, { align: 'right' });
    doc.moveDown();

    // GST breakdown
    doc.text('CGST (9%)', 70);
    doc.text((transaction.gstAmount / 2).toFixed(2), 400, doc.y - 15, { align: 'right' });
    doc.moveDown();

    doc.text('SGST (9%)', 70);
    doc.text((transaction.gstAmount / 2).toFixed(2), 400, doc.y - 15, { align: 'right' });
    doc.moveDown();

    // Total line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold');
    doc.text('Total GST:', 50);
    doc.text(transaction.gstAmount.toFixed(2), 400, doc.y - 15, { align: 'right' });
    doc.moveDown();

    doc.text('Net Income (Commission - GST):', 50);
    doc.text(transaction.netIncome.toFixed(2), 400, doc.y - 15, { align: 'right' });
    doc.moveDown(2);

    // Important notes
    doc.font('Helvetica').fontSize(9);
    doc.text('IMPORTANT NOTES:', { underline: true });
    doc.moveDown(0.5);
    doc.text(`• Total Amount Received via QR: ₹${transaction.totalReceived.toFixed(2)}`);
    doc.text(`• Amount Returned to Merchant/Customer: ₹${transaction.returnAmount.toFixed(2)}`);
    doc.text(`• GST @${process.env.GST_RATE || 18}% applies ONLY on commission amount (₹${transaction.commissionAmount.toFixed(2)})`);
    doc.text('• Total Received amount is NOT revenue and is NOT subject to GST');
    doc.moveDown();

    // Footer
    doc.fontSize(8).text('This is a computer-generated invoice.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Export transactions to Excel
 * GET /api/v1/export/excel?month=&year=
 */
export const exportToExcel = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    // Build query
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

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    // Handle empty result
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for the selected period'
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Set column headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Received (₹)', key: 'totalReceived', width: 20 },
      { header: 'Commission %', key: 'commissionPercent', width: 15 },
      { header: 'Commission Amount (₹)', key: 'commissionAmount', width: 22 },
      { header: 'GST Amount (₹)', key: 'gstAmount', width: 18 },
      { header: 'Net Income (₹)', key: 'netIncome', width: 18 },
      { header: 'Return Amount (₹)', key: 'returnAmount', width: 20 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Created By', key: 'createdBy', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    transactions.forEach(transaction => {
      const createdByInfo = transaction.createdBy 
        ? `${transaction.createdBy.name || 'N/A'} (${transaction.createdBy.email || 'N/A'})`
        : 'N/A';
      
      // Format date safely
      let formattedDate = 'N/A';
      try {
        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
        formattedDate = date.toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
      } catch (e) {
        formattedDate = transaction.date?.toString() || 'N/A';
      }
      
      worksheet.addRow({
        date: formattedDate,
        totalReceived: transaction.totalReceived || 0,
        commissionPercent: transaction.commissionPercent || 0,
        commissionAmount: transaction.commissionAmount || 0,
        gstAmount: transaction.gstAmount || 0,
        netIncome: transaction.netIncome || 0,
        returnAmount: transaction.returnAmount || 0,
        paymentMode: transaction.paymentMode || 'QR',
        createdBy: createdByInfo,
        remarks: transaction.remarks || ''
      });
    });

    // Format number columns
    worksheet.getColumn('totalReceived').numFmt = '#,##0.00';
    worksheet.getColumn('commissionAmount').numFmt = '#,##0.00';
    worksheet.getColumn('gstAmount').numFmt = '#,##0.00';
    worksheet.getColumn('netIncome').numFmt = '#,##0.00';
    worksheet.getColumn('returnAmount').numFmt = '#,##0.00';
    worksheet.getColumn('commissionPercent').numFmt = '0.00';

    // Add summary row
    const summaryRow = worksheet.addRow({});
    summaryRow.font = { bold: true };
    
    const totals = transactions.reduce((acc, t) => ({
      totalReceived: acc.totalReceived + t.totalReceived,
      commissionAmount: acc.commissionAmount + t.commissionAmount,
      gstAmount: acc.gstAmount + t.gstAmount,
      netIncome: acc.netIncome + t.netIncome,
      returnAmount: acc.returnAmount + t.returnAmount
    }), {
      totalReceived: 0,
      commissionAmount: 0,
      gstAmount: 0,
      netIncome: 0,
      returnAmount: 0
    });

    worksheet.addRow({
      date: 'TOTAL',
      totalReceived: totals.totalReceived,
      commissionAmount: totals.commissionAmount,
      gstAmount: totals.gstAmount,
      netIncome: totals.netIncome,
      returnAmount: totals.returnAmount
    });

    const totalRow = worksheet.lastRow;
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0E0' }
    };

    // Set response headers
    const filename = `transactions-${year || 'all'}-${month || 'all'}-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    try {
      await workbook.xlsx.write(res);
      res.end();
    } catch (writeError) {
      console.error('Excel write error:', writeError);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate Excel file',
          error: writeError.message
        });
      }
    }
  } catch (error) {
    console.error('Excel export error:', error);
    if (!res.headersSent) {
      next(error);
    }
  }
};
