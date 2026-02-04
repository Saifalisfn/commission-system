import mongoose from 'mongoose';

/**
 * Transaction Schema
 * 
 * CRITICAL GST COMPLIANCE NOTES:
 * - totalReceived: Full amount received via QR (NOT revenue)
 * - commissionAmount: Platform's commission (revenue)
 * - gstAmount: GST @18% on commission ONLY (not on totalReceived)
 * - netIncome: Commission minus GST (actual income)
 * - returnAmount: Amount returned to merchant/customer
 * 
 * GST Rule: GST applies ONLY on commission, never on totalReceived
 */
const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  totalReceived: {
    type: Number,
    required: [true, 'Total received amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  commissionPercent: {
    type: Number,
    required: [true, 'Commission percentage is required'],
    min: [0, 'Commission cannot be negative'],
    max: [100, 'Commission cannot exceed 100%'],
    default: 1 // Default 1% as per requirements
  },
  commissionAmount: {
    type: Number,
    required: [true, 'Commission amount is required'],
    min: [0, 'Commission cannot be negative']
  },
  gstAmount: {
    type: Number,
    required: [true, 'GST amount is required'],
    min: [0, 'GST cannot be negative']
  },
  netIncome: {
    type: Number,
    required: [true, 'Net income is required']
  },
  returnAmount: {
    type: Number,
    required: [true, 'Return amount is required'],
    min: [0, 'Return amount cannot be negative']
  },
  paymentMode: {
    type: String,
    enum: ['QR'],
    default: 'QR',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator user ID is required']
  },
  // Additional fields for audit trail
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  invoiceNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when present
    match: [/^INV-FY\d{2}-\d{5}$/, 'Invoice number must be in format INV-FYXX-XXXXX']
  },
  financialYear: {
    type: String,
    required: false,
    match: [/^FY\d{2}$/, 'Financial year must be in format FYXX']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ date: -1 });
transactionSchema.index({ createdBy: 1, date: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ invoiceNumber: 1 });
transactionSchema.index({ financialYear: 1, date: -1 });

// Virtual for formatted date
transactionSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Ensure virtuals are included in JSON
transactionSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Transaction', transactionSchema);
