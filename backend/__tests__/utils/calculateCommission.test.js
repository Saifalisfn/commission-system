import { describe, test, expect } from '@jest/globals';
import { calculateCommission, validateCalculations } from '../../utils/calculateCommission.js';

describe('calculateCommission', () => {
  describe('standard calculations', () => {
    test('calculates correct values for 1000 at 1% commission and 18% GST', () => {
      const result = calculateCommission(1000, 1, 18);
      expect(result.commissionAmount).toBe(10);
      expect(result.gstAmount).toBe(1.8);
      expect(result.netIncome).toBe(8.2);
      expect(result.returnAmount).toBe(990);
    });

    test('uses default commissionPercent of 1% and gstRate of 18%', () => {
      const result = calculateCommission(1000);
      expect(result.commissionAmount).toBe(10);
      expect(result.gstAmount).toBe(1.8);
      expect(result.netIncome).toBe(8.2);
      expect(result.returnAmount).toBe(990);
    });

    test('calculates with 2% commission', () => {
      const result = calculateCommission(1000, 2, 18);
      expect(result.commissionAmount).toBe(20);
      expect(result.gstAmount).toBe(3.6);
      expect(result.netIncome).toBe(16.4);
      expect(result.returnAmount).toBe(980);
    });

    test('rounds all results to 2 decimal places', () => {
      // 333 * 1% = 3.33, * 18% = 0.5994 -> rounds to 0.6
      const result = calculateCommission(333, 1, 18);
      expect(result.commissionAmount).toBe(3.33);
      expect(result.gstAmount).toBe(0.6);
      expect(result.netIncome).toBe(2.73);
      expect(result.returnAmount).toBe(329.67);
    });

    test('GST is calculated only on commission, not on totalReceived', () => {
      // commission = 100, GST must be 18 (18% of 100), NOT 1800 (18% of 10000)
      const result = calculateCommission(10000, 1, 18);
      expect(result.commissionAmount).toBe(100);
      expect(result.gstAmount).toBe(18);
    });

    test('commission + returnAmount always equals totalReceived', () => {
      const amounts = [100, 999.99, 5000, 1234.56];
      amounts.forEach(amount => {
        const result = calculateCommission(amount, 1, 18);
        expect(result.commissionAmount + result.returnAmount).toBeCloseTo(amount, 2);
      });
    });

    test('handles large amounts correctly', () => {
      const result = calculateCommission(1000000, 1, 18);
      expect(result.commissionAmount).toBe(10000);
      expect(result.gstAmount).toBe(1800);
      expect(result.netIncome).toBe(8200);
      expect(result.returnAmount).toBe(990000);
    });

    test('handles minimum positive amount', () => {
      const result = calculateCommission(1, 1, 18);
      expect(result.commissionAmount).toBe(0.01);
      expect(result.returnAmount).toBe(0.99);
    });
  });

  describe('edge cases', () => {
    test('0% commission results in zero commission and full return', () => {
      const result = calculateCommission(1000, 0, 18);
      expect(result.commissionAmount).toBe(0);
      expect(result.gstAmount).toBe(0);
      expect(result.netIncome).toBe(0);
      expect(result.returnAmount).toBe(1000);
    });

    test('0% GST means commission equals netIncome', () => {
      const result = calculateCommission(1000, 1, 0);
      expect(result.gstAmount).toBe(0);
      expect(result.netIncome).toBe(result.commissionAmount);
    });

    test('100% commission means returnAmount is 0', () => {
      const result = calculateCommission(1000, 100, 18);
      expect(result.commissionAmount).toBe(1000);
      expect(result.returnAmount).toBe(0);
    });
  });

  describe('input validation', () => {
    test('throws for zero totalReceived', () => {
      expect(() => calculateCommission(0)).toThrow('Total received amount must be greater than 0');
    });

    test('throws for negative totalReceived', () => {
      expect(() => calculateCommission(-500)).toThrow('Total received amount must be greater than 0');
    });

    test('throws for negative commissionPercent', () => {
      expect(() => calculateCommission(1000, -1)).toThrow('Commission percentage must be between 0 and 100');
    });

    test('throws for commissionPercent above 100', () => {
      expect(() => calculateCommission(1000, 101)).toThrow('Commission percentage must be between 0 and 100');
    });

    test('throws for negative gstRate', () => {
      expect(() => calculateCommission(1000, 1, -1)).toThrow('GST rate must be between 0 and 100');
    });

    test('throws for gstRate above 100', () => {
      expect(() => calculateCommission(1000, 1, 101)).toThrow('GST rate must be between 0 and 100');
    });
  });
});

describe('validateCalculations', () => {
  test('returns true for a correct calculation result', () => {
    const result = calculateCommission(1000, 1, 18);
    expect(validateCalculations(1000, result)).toBe(true);
  });

  test('returns true across multiple valid amounts', () => {
    [100, 500, 9999.99, 50000].forEach(amount => {
      const result = calculateCommission(amount, 1, 18);
      expect(validateCalculations(amount, result)).toBe(true);
    });
  });

  test('returns false when returnAmount is wrong', () => {
    const bad = { commissionAmount: 10, gstAmount: 1.8, netIncome: 8.2, returnAmount: 985 };
    expect(validateCalculations(1000, bad)).toBe(false);
  });

  test('returns false when netIncome is wrong', () => {
    const bad = { commissionAmount: 10, gstAmount: 1.8, netIncome: 9.5, returnAmount: 990 };
    expect(validateCalculations(1000, bad)).toBe(false);
  });

  test('tolerates rounding differences within 0.01', () => {
    const slightlyOff = { commissionAmount: 10, gstAmount: 1.8, netIncome: 8.205, returnAmount: 990 };
    expect(validateCalculations(1000, slightlyOff)).toBe(true);
  });
});
