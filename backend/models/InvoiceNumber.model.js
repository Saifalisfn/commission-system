import mongoose from 'mongoose';

/**
 * Invoice Number Series Model
 * 
 * Maintains financial year-based invoice number sequences
 * Format: INV-FY{YY}-{XXXXX}
 * Example: INV-FY24-00001, INV-FY24-00002, etc.
 */
const invoiceNumberSchema = new mongoose.Schema({
  financialYear: {
    type: String,
    required: true,
    unique: true,
    match: [/^FY\d{2}$/, 'Financial year must be in format FYXX (e.g., FY24)']
  },
  lastSequenceNumber: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  prefix: {
    type: String,
    default: 'INV',
    required: true
  }
}, {
  timestamps: true
});

// Index for fast lookups
invoiceNumberSchema.index({ financialYear: 1 });

/**
 * Get next invoice number for a financial year
 * @param {String} financialYear - Financial year in format FYXX
 * @returns {Promise<String>} Next invoice number
 */
invoiceNumberSchema.statics.getNextInvoiceNumber = async function(financialYear) {
  const invoiceSeries = await this.findOneAndUpdate(
    { financialYear },
    { $inc: { lastSequenceNumber: 1 } },
    { upsert: true, new: true }
  );

  const sequence = String(invoiceSeries.lastSequenceNumber).padStart(5, '0');
  return `${invoiceSeries.prefix}-${financialYear}-${sequence}`;
};

/**
 * Get financial year from date
 * @param {Date} date - Date to get financial year for
 * @returns {String} Financial year in format FYXX
 */
invoiceNumberSchema.statics.getFinancialYear = function(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // Indian Financial Year: April (4) to March (3)
  // If month >= April, FY is current year, else previous year
  const financialYear = month >= 4 ? year : year - 1;
  const fyShort = String(financialYear).slice(-2);
  
  return `FY${fyShort}`;
};

export default mongoose.model('InvoiceNumber', invoiceNumberSchema);
