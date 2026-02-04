import mongoose from 'mongoose';

/**
 * GST Filing Lock Model
 * 
 * Prevents editing transactions after GST filing for a month
 * Once locked, transactions for that month cannot be modified
 */
const gstFilingLockSchema = new mongoose.Schema({
  financialYear: {
    type: String,
    required: true,
    match: [/^FY\d{2}$/, 'Financial year must be in format FYXX']
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  lockedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filingPeriod: {
    type: String,
    required: true,
    // Format: FY24-04 (Financial Year - Month)
    match: [/^FY\d{2}-\d{2}$/, 'Filing period must be in format FYXX-MM']
  },
  gstr1FilingDate: {
    type: Date,
    required: false
  },
  gstr3BFilingDate: {
    type: Date,
    required: false
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  isLocked: {
    type: Boolean,
    default: true,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index: one lock per month-year combination
gstFilingLockSchema.index({ financialYear: 1, month: 1, year: 1 }, { unique: true });
gstFilingLockSchema.index({ filingPeriod: 1 }, { unique: true });
gstFilingLockSchema.index({ year: 1, month: 1 });

/**
 * Check if a date is locked
 * @param {Date} date - Transaction date to check
 * @returns {Promise<Boolean>} True if locked
 */
gstFilingLockSchema.statics.isDateLocked = async function(date) {
  const transactionDate = new Date(date);
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth() + 1;
  
  // Get financial year
  const InvoiceNumber = mongoose.model('InvoiceNumber');
  const financialYear = InvoiceNumber.getFinancialYear(transactionDate);
  
  const lock = await this.findOne({
    financialYear,
    month,
    year,
    isLocked: true
  });
  
  return !!lock;
};

/**
 * Lock a month for GST filing
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @param {ObjectId} lockedBy - User ID who is locking
 * @param {Object} options - Additional options (gstr1FilingDate, gstr3BFilingDate, remarks)
 * @returns {Promise<Object>} Created lock document
 */
gstFilingLockSchema.statics.lockMonth = async function(month, year, lockedBy, options = {}) {
  const InvoiceNumber = mongoose.model('InvoiceNumber');
  const transactionDate = new Date(year, month - 1, 1);
  const financialYear = InvoiceNumber.getFinancialYear(transactionDate);
  
  const filingPeriod = `${financialYear}-${String(month).padStart(2, '0')}`;
  
  const lock = await this.findOneAndUpdate(
    { financialYear, month, year },
    {
      financialYear,
      month,
      year,
      lockedBy,
      filingPeriod,
      isLocked: true,
      lockedAt: new Date(),
      gstr1FilingDate: options.gstr1FilingDate || null,
      gstr3BFilingDate: options.gstr3BFilingDate || null,
      remarks: options.remarks || ''
    },
    { upsert: true, new: true }
  );
  
  return lock;
};

/**
 * Unlock a month (for corrections/adjustments)
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Object>} Updated lock document
 */
gstFilingLockSchema.statics.unlockMonth = async function(month, year) {
  const InvoiceNumber = mongoose.model('InvoiceNumber');
  const transactionDate = new Date(year, month - 1, 1);
  const financialYear = InvoiceNumber.getFinancialYear(transactionDate);
  
  const lock = await this.findOneAndUpdate(
    { financialYear, month, year },
    { isLocked: false },
    { new: true }
  );
  
  return lock;
};

export default mongoose.model('GSTFilingLock', gstFilingLockSchema);
