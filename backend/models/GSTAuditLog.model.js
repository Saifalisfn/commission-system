import mongoose from 'mongoose';

/**
 * GST Audit Log Model
 * 
 * Tracks all GST-related actions for audit purposes
 * Includes: filing locks, report generation, exports, etc.
 */
const gstAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'FILING_LOCKED',
      'FILING_UNLOCKED',
      'GSTR1_GENERATED',
      'GSTR3B_GENERATED',
      'GSTR1_EXPORTED',
      'REPORT_GENERATED',
      'EXCEL_EXPORTED',
      'INVOICE_GENERATED',
      'TRANSACTION_CREATED',
      'TRANSACTION_UPDATED',
      'TRANSACTION_DELETED',
      'VALIDATION_FAILED'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['TRANSACTION', 'FILING_LOCK', 'REPORT', 'EXPORT'],
    required: false
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  period: {
    financialYear: String,
    month: Number,
    year: Number,
    filingPeriod: String // FYXX-MM format
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    // Flexible structure for different action types
    // Examples:
    // - For FILING_LOCKED: { month, year, gstr1FilingDate, gstr3BFilingDate }
    // - For TRANSACTION_CREATED: { transactionId, invoiceNumber, amount, commission }
    // - For VALIDATION_FAILED: { reason, field, value }
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING'],
    default: 'SUCCESS'
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
gstAuditLogSchema.index({ action: 1, createdAt: -1 });
gstAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
gstAuditLogSchema.index({ 'period.filingPeriod': 1, createdAt: -1 });
gstAuditLogSchema.index({ entityType: 1, entityId: 1 });
gstAuditLogSchema.index({ createdAt: -1 });

/**
 * Create audit log entry
 * @param {Object} logData - Log data
 * @returns {Promise<Object>} Created log entry
 */
gstAuditLogSchema.statics.createLog = async function(logData) {
  return await this.create({
    action: logData.action,
    performedBy: logData.performedBy,
    entityType: logData.entityType,
    entityId: logData.entityId,
    period: logData.period,
    details: logData.details,
    ipAddress: logData.ipAddress,
    userAgent: logData.userAgent,
    status: logData.status || 'SUCCESS',
    errorMessage: logData.errorMessage
  });
};

export default mongoose.model('GSTAuditLog', gstAuditLogSchema);
