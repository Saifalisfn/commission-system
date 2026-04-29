import { describe, test, expect } from '@jest/globals';
import {
  validateGSTCompliance,
  filterForGSTReporting,
  validateTransactionForGST
} from '../../utils/gstValidation.js';

// Build a transaction object that satisfies all GST rules
function makeTransaction(overrides = {}) {
  const base = {
    _id: 'txn-001',
    totalReceived: 1000,
    commissionAmount: 10,      // 1% of 1000
    gstAmount: 1.8,            // 18% of commission
    netIncome: 8.2,            // commission - gst
    returnAmount: 990,         // totalReceived - commission
    ...overrides
  };
  return base;
}

describe('validateGSTCompliance', () => {
  test('passes for a single valid transaction', () => {
    const result = validateGSTCompliance([makeTransaction()]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test('passes for multiple valid transactions', () => {
    const txns = [
      makeTransaction({ _id: 'a' }),
      makeTransaction({ _id: 'b', totalReceived: 5000, commissionAmount: 50, gstAmount: 9, netIncome: 41, returnAmount: 4950 }),
    ];
    const result = validateGSTCompliance(txns);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns empty result for an empty array', () => {
    const result = validateGSTCompliance([]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.totalTransactions).toBe(0);
  });

  test('errors when commissionAmount is zero', () => {
    const result = validateGSTCompliance([makeTransaction({ commissionAmount: 0 })]);
    expect(result.isValid).toBe(false);
    const fields = result.errors.map(e => e.field);
    expect(fields).toContain('commissionAmount');
  });

  test('errors when commissionAmount is missing', () => {
    const result = validateGSTCompliance([makeTransaction({ commissionAmount: undefined })]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('commissionAmount');
  });

  test('errors when gstAmount does not match 18% of commission', () => {
    // correct gst would be 1.8, providing 3.0 instead
    const result = validateGSTCompliance([makeTransaction({ gstAmount: 3.0 })]);
    expect(result.isValid).toBe(false);
    const gstError = result.errors.find(e => e.field === 'gstAmount');
    expect(gstError).toBeDefined();
  });

  test('allows small rounding differences in gstAmount (within 0.01)', () => {
    // 10 * 18% = 1.8, so 1.805 should be OK
    const result = validateGSTCompliance([makeTransaction({ gstAmount: 1.805 })]);
    const gstErrors = result.errors.filter(e => e.field === 'gstAmount');
    expect(gstErrors).toHaveLength(0);
  });

  test('errors when netIncome does not equal commission minus gst', () => {
    const result = validateGSTCompliance([makeTransaction({ netIncome: 5.0 })]);
    expect(result.isValid).toBe(false);
    const err = result.errors.find(e => e.field === 'netIncome');
    expect(err).toBeDefined();
  });

  test('errors when returnAmount does not equal totalReceived minus commission', () => {
    const result = validateGSTCompliance([makeTransaction({ returnAmount: 900 })]);
    expect(result.isValid).toBe(false);
    const err = result.errors.find(e => e.field === 'returnAmount');
    expect(err).toBeDefined();
  });

  test('adds warning when totalReceived equals commissionAmount', () => {
    // Edge case: all received is commission (unusual but produces a warning)
    const result = validateGSTCompliance([
      makeTransaction({ totalReceived: 10, commissionAmount: 10, returnAmount: 0 })
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('reports correct summary counts', () => {
    const txns = [
      makeTransaction({ _id: 'good' }),
      makeTransaction({ _id: 'bad', commissionAmount: 0 }),
    ];
    const result = validateGSTCompliance(txns);
    expect(result.summary.totalTransactions).toBe(2);
    expect(result.summary.errorCount).toBeGreaterThan(0);
  });

  test('error objects include transactionIndex and transactionId', () => {
    const result = validateGSTCompliance([makeTransaction({ commissionAmount: 0 })]);
    expect(result.errors[0]).toMatchObject({
      transactionIndex: 0,
      transactionId: 'txn-001'
    });
  });
});

describe('filterForGSTReporting', () => {
  test('maps commissionAmount to taxableValue (not totalReceived)', () => {
    const filtered = filterForGSTReporting([makeTransaction()]);
    expect(filtered[0].taxableValue).toBe(10);       // commissionAmount
    expect(filtered[0].taxableValue).not.toBe(1000); // NOT totalReceived
  });

  test('splits gstAmount equally into cgst and sgst', () => {
    const filtered = filterForGSTReporting([makeTransaction()]);
    expect(filtered[0].cgst).toBe(0.9);
    expect(filtered[0].sgst).toBe(0.9);
    expect(filtered[0].totalGST).toBe(1.8);
  });

  test('sets igst to 0 for intra-state transactions', () => {
    const filtered = filterForGSTReporting([makeTransaction()]);
    expect(filtered[0].igst).toBe(0);
  });

  test('output does NOT contain totalReceived or returnAmount', () => {
    const filtered = filterForGSTReporting([makeTransaction()]);
    expect(filtered[0]).not.toHaveProperty('totalReceived');
    expect(filtered[0]).not.toHaveProperty('returnAmount');
  });

  test('preserves invoiceNumber, date and netIncome fields', () => {
    const txn = makeTransaction({ invoiceNumber: 'INV-FY24-00001', date: new Date('2024-06-01') });
    const filtered = filterForGSTReporting([txn]);
    expect(filtered[0].invoiceNumber).toBe('INV-FY24-00001');
    expect(filtered[0].netIncome).toBe(8.2);
  });

  test('returns one entry per transaction', () => {
    const txns = [makeTransaction({ _id: 'a' }), makeTransaction({ _id: 'b' })];
    expect(filterForGSTReporting(txns)).toHaveLength(2);
  });
});

describe('validateTransactionForGST', () => {
  test('passes for a valid transaction', () => {
    const result = validateTransactionForGST(makeTransaction());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('errors when commissionAmount is missing', () => {
    const result = validateTransactionForGST(makeTransaction({ commissionAmount: undefined }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Commission'))).toBe(true);
  });

  test('errors when commissionAmount is zero', () => {
    const result = validateTransactionForGST(makeTransaction({ commissionAmount: 0 }));
    expect(result.isValid).toBe(false);
  });

  test('errors when gstAmount is missing', () => {
    const result = validateTransactionForGST(makeTransaction({ gstAmount: undefined }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('GST'))).toBe(true);
  });

  test('errors when gstAmount is zero', () => {
    const result = validateTransactionForGST(makeTransaction({ gstAmount: 0 }));
    expect(result.isValid).toBe(false);
  });

  test('errors when totalReceived equals commissionAmount', () => {
    const result = validateTransactionForGST(
      makeTransaction({ totalReceived: 10, commissionAmount: 10 })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Total received cannot equal'))).toBe(true);
  });
});
