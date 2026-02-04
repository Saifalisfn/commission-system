import InvoiceNumber from '../models/InvoiceNumber.model.js';

/**
 * Generate invoice number for a transaction date
 * Format: INV-FY{YY}-{XXXXX}
 * Example: INV-FY24-00001
 * 
 * @param {Date} date - Transaction date
 * @returns {Promise<String>} Invoice number
 */
export async function generateInvoiceNumber(date = new Date()) {
  const financialYear = InvoiceNumber.getFinancialYear(date);
  const invoiceNumber = await InvoiceNumber.getNextInvoiceNumber(financialYear);
  return invoiceNumber;
}

/**
 * Get financial year from date (Indian FY: April to March)
 * @param {Date} date - Date
 * @returns {String} Financial year in format FYXX
 */
export function getFinancialYear(date = new Date()) {
  return InvoiceNumber.getFinancialYear(date);
}

/**
 * Validate invoice number format
 * @param {String} invoiceNumber - Invoice number to validate
 * @returns {Boolean} True if valid
 */
export function validateInvoiceNumber(invoiceNumber) {
  const pattern = /^INV-FY\d{2}-\d{5}$/;
  return pattern.test(invoiceNumber);
}
