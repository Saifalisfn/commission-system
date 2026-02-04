import Transaction from '../models/Transaction.model.js';

/**
 * GST Validation Utilities
 * 
 * Ensures GST compliance:
 * - Only commission income is included in GST reports
 * - Total received is NEVER included in taxable value
 */

/**
 * Validate that only commission income is included in GST calculations
 * @param {Array} transactions - Transactions to validate
 * @returns {Object} Validation result
 */
export function validateGSTCompliance(transactions) {
  const errors = [];
  const warnings = [];

  transactions.forEach((transaction, index) => {
    // Rule 1: Commission amount must be positive
    if (!transaction.commissionAmount || transaction.commissionAmount <= 0) {
      errors.push({
        transactionIndex: index,
        transactionId: transaction._id,
        field: 'commissionAmount',
        message: 'Commission amount must be greater than 0 for GST calculation'
      });
    }

    // Rule 2: GST must be calculated ONLY on commission
    const expectedGST = transaction.commissionAmount * 0.18;
    const gstDifference = Math.abs(transaction.gstAmount - expectedGST);
    
    if (gstDifference > 0.01) { // Allow small rounding differences
      errors.push({
        transactionIndex: index,
        transactionId: transaction._id,
        field: 'gstAmount',
        message: `GST amount (${transaction.gstAmount}) does not match 18% of commission (${expectedGST})`
      });
    }

    // Rule 3: Total received should NOT equal commission (sanity check)
    if (Math.abs(transaction.totalReceived - transaction.commissionAmount) < 0.01) {
      warnings.push({
        transactionIndex: index,
        transactionId: transaction._id,
        message: 'Total received equals commission amount. Verify this is correct.'
      });
    }

    // Rule 4: Net income should equal commission minus GST
    const expectedNetIncome = transaction.commissionAmount - transaction.gstAmount;
    const netIncomeDifference = Math.abs(transaction.netIncome - expectedNetIncome);
    
    if (netIncomeDifference > 0.01) {
      errors.push({
        transactionIndex: index,
        transactionId: transaction._id,
        field: 'netIncome',
        message: `Net income (${transaction.netIncome}) does not match commission - GST (${expectedNetIncome})`
      });
    }

    // Rule 5: Return amount should equal total received minus commission
    const expectedReturn = transaction.totalReceived - transaction.commissionAmount;
    const returnDifference = Math.abs(transaction.returnAmount - expectedReturn);
    
    if (returnDifference > 0.01) {
      errors.push({
        transactionIndex: index,
        transactionId: transaction._id,
        field: 'returnAmount',
        message: `Return amount (${transaction.returnAmount}) does not match total received - commission (${expectedReturn})`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalTransactions: transactions.length,
      validTransactions: transactions.length - errors.length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

/**
 * Filter transactions to include only commission income for GST reporting
 * This ensures totalReceived is NEVER included in taxable value
 * @param {Array} transactions - All transactions
 * @returns {Array} Filtered transactions (only commission-related data)
 */
export function filterForGSTReporting(transactions) {
  return transactions.map(transaction => ({
    invoiceNumber: transaction.invoiceNumber,
    date: transaction.date,
    taxableValue: transaction.commissionAmount, // ONLY commission, NOT totalReceived
    cgst: transaction.gstAmount / 2,
    sgst: transaction.gstAmount / 2,
    igst: 0, // Assuming intra-state transactions
    totalGST: transaction.gstAmount,
    netIncome: transaction.netIncome,
    // Exclude totalReceived and returnAmount from GST reports
    // These are NOT part of taxable value
  }));
}

/**
 * Validate transaction before including in GST report
 * @param {Object} transaction - Transaction to validate
 * @returns {Object} Validation result
 */
export function validateTransactionForGST(transaction) {
  const errors = [];

  // Ensure commission amount exists and is positive
  if (!transaction.commissionAmount || transaction.commissionAmount <= 0) {
    errors.push('Commission amount must be positive for GST reporting');
  }

  // Ensure GST is calculated
  if (!transaction.gstAmount || transaction.gstAmount <= 0) {
    errors.push('GST amount must be positive for GST reporting');
  }

  // Ensure totalReceived is NOT being used as taxable value
  if (transaction.totalReceived === transaction.commissionAmount) {
    errors.push('Total received cannot equal commission amount - verify calculation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
