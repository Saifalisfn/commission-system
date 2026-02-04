/**
 * Commission & GST Calculation Utility
 * 
 * CRITICAL BUSINESS LOGIC (GST COMPLIANCE):
 * 
 * 1. Commission = totalReceived × commissionPercent / 100
 * 2. GST = commission × GST_RATE / 100 (GST applies ONLY on commission)
 * 3. Net Income = commission - GST
 * 4. Return Amount = totalReceived - commission
 * 
 * IMPORTANT: 
 * - totalReceived is NOT revenue
 * - Only commissionAmount is revenue
 * - GST is calculated ONLY on commissionAmount
 * - This ensures GST compliance for Indian tax regulations
 */

/**
 * Calculate commission, GST, net income, and return amount
 * @param {number} totalReceived - Full amount received via QR
 * @param {number} commissionPercent - Commission percentage (default: 1%)
 * @param {number} gstRate - GST rate percentage (default: 18%)
 * @returns {Object} Calculation results
 */
export function calculateCommission(totalReceived, commissionPercent = 1, gstRate = 18) {
  // Validate inputs
  if (totalReceived <= 0) {
    throw new Error('Total received amount must be greater than 0');
  }
  if (commissionPercent < 0 || commissionPercent > 100) {
    throw new Error('Commission percentage must be between 0 and 100');
  }
  if (gstRate < 0 || gstRate > 100) {
    throw new Error('GST rate must be between 0 and 100');
  }

  // Step 1: Calculate commission (platform's revenue)
  const commissionAmount = (totalReceived * commissionPercent) / 100;

  // Step 2: Calculate GST (18% on commission ONLY, not on totalReceived)
  const gstAmount = (commissionAmount * gstRate) / 100;

  // Step 3: Calculate net income (commission minus GST)
  const netIncome = commissionAmount - gstAmount;

  // Step 4: Calculate return amount (amount returned to merchant/customer)
  const returnAmount = totalReceived - commissionAmount;

  // Round to 2 decimal places for currency precision
  return {
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    netIncome: Math.round(netIncome * 100) / 100,
    returnAmount: Math.round(returnAmount * 100) / 100
  };
}

/**
 * Validate calculation results
 * @param {number} totalReceived 
 * @param {Object} calculations 
 * @returns {boolean}
 */
export function validateCalculations(totalReceived, calculations) {
  const { commissionAmount, gstAmount, netIncome, returnAmount } = calculations;
  
  // Check: commission + return = totalReceived
  const sumCheck = Math.abs((commissionAmount + returnAmount) - totalReceived) < 0.01;
  
  // Check: commission - GST = netIncome
  const netCheck = Math.abs((commissionAmount - gstAmount) - netIncome) < 0.01;
  
  return sumCheck && netCheck;
}
