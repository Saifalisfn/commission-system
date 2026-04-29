import { describe, test, expect } from '@jest/globals';
import { validateInvoiceNumber, getFinancialYear } from '../../utils/invoiceNumber.js';

describe('validateInvoiceNumber', () => {
  describe('valid formats', () => {
    test('accepts INV-FY24-00001', () => {
      expect(validateInvoiceNumber('INV-FY24-00001')).toBe(true);
    });

    test('accepts INV-FY25-99999', () => {
      expect(validateInvoiceNumber('INV-FY25-99999')).toBe(true);
    });

    test('accepts first invoice of a financial year', () => {
      expect(validateInvoiceNumber('INV-FY26-00001')).toBe(true);
    });

    test('accepts sequence number with leading zeros', () => {
      expect(validateInvoiceNumber('INV-FY24-00100')).toBe(true);
    });
  });

  describe('invalid formats', () => {
    test('rejects wrong prefix', () => {
      expect(validateInvoiceNumber('INV-FY24-001')).toBe(false);
    });

    test('rejects sequence shorter than 5 digits', () => {
      expect(validateInvoiceNumber('INV-FY24-0001')).toBe(false);
    });

    test('rejects sequence longer than 5 digits', () => {
      expect(validateInvoiceNumber('INV-FY24-000001')).toBe(false);
    });

    test('rejects wrong FY digit count (3 digits)', () => {
      expect(validateInvoiceNumber('INV-FY245-00001')).toBe(false);
    });

    test('rejects wrong FY digit count (1 digit)', () => {
      expect(validateInvoiceNumber('INV-FY2-00001')).toBe(false);
    });

    test('rejects missing INV prefix', () => {
      expect(validateInvoiceNumber('FY24-00001')).toBe(false);
    });

    test('rejects letters in sequence number', () => {
      expect(validateInvoiceNumber('INV-FY24-0000A')).toBe(false);
    });

    test('rejects empty string', () => {
      expect(validateInvoiceNumber('')).toBe(false);
    });

    test('rejects null-like string', () => {
      expect(validateInvoiceNumber('null')).toBe(false);
    });
  });
});

describe('getFinancialYear', () => {
  // Indian FY runs April–March: if month >= April, FY = current year, else previous year

  test('April falls in the current financial year', () => {
    expect(getFinancialYear(new Date('2024-04-01'))).toBe('FY24');
  });

  test('March falls in the previous financial year', () => {
    expect(getFinancialYear(new Date('2025-03-31'))).toBe('FY24');
  });

  test('January falls in the previous financial year', () => {
    expect(getFinancialYear(new Date('2025-01-15'))).toBe('FY24');
  });

  test('October falls in the current financial year', () => {
    expect(getFinancialYear(new Date('2024-10-15'))).toBe('FY24');
  });

  test('FY boundary: last day of March is in the previous FY', () => {
    expect(getFinancialYear(new Date('2026-03-31'))).toBe('FY25');
  });

  test('FY boundary: first day of April starts a new FY', () => {
    expect(getFinancialYear(new Date('2026-04-01'))).toBe('FY26');
  });

  test('returns two-digit year suffix prefixed with FY', () => {
    const result = getFinancialYear(new Date('2024-06-01'));
    expect(result).toMatch(/^FY\d{2}$/);
  });
});
