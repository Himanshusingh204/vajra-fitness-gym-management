import { describe, it, expect } from 'vitest';
import { splitOrder } from '../src/services/commission';

describe('splitOrder', () => {
  it('splits a GST-registered gym order', () => {
    expect(splitOrder(100000, 1800, 1000)).toEqual({
      basePaise: 100000,
      gstPaise: 18000,
      totalPaise: 118000,
      commissionPaise: 10000,
      commissionGstPaise: 1800,
      gymNetPaise: 106200,
    });
  });

  it('adds no GST for a gym without a GSTIN', () => {
    const s = splitOrder(99900, 0, 1000);
    expect(s.totalPaise).toBe(99900);
    expect(s.commissionPaise).toBe(9990);
    expect(s.commissionGstPaise).toBe(1798); // 1798.2
  });

  it('rounds each line half-up to a paisa', () => {
    // 5 x 10% = 0.5 -> 1 commission; 1 x 18% = 0.18 -> 0 GST on it
    expect(splitOrder(5, 0, 1000)).toMatchObject({ commissionPaise: 1, commissionGstPaise: 0, gymNetPaise: 4 });
    // 25 x 18% = 4.5 -> 5 GST; 25 x 10% = 2.5 -> 3 commission; 3 x 18% = 0.54 -> 1
    expect(splitOrder(25, 1800, 1000)).toMatchObject({ gstPaise: 5, totalPaise: 30, commissionPaise: 3, commissionGstPaise: 1, gymNetPaise: 26 });
    // 14 x 10% = 1.4 -> 1
    expect(splitOrder(14, 0, 1000).commissionPaise).toBe(1);
  });

  it('handles zero amounts and the commission limits', () => {
    expect(splitOrder(0, 1800, 1000).gymNetPaise).toBe(0);
    expect(splitOrder(1000, 1800, 0)).toMatchObject({ commissionPaise: 0, gymNetPaise: 1180 });
    // 100% commission plus GST on it is more than the order is worth
    expect(() => splitOrder(1000, 0, 10000)).toThrow('INVALID_AMOUNT');
  });

  it('rejects fractional or negative inputs', () => {
    expect(() => splitOrder(100.5, 1800, 1000)).toThrow('INVALID_AMOUNT');
    expect(() => splitOrder(-1, 1800, 1000)).toThrow('INVALID_AMOUNT');
    expect(() => splitOrder(100, 1800, 10001)).toThrow('INVALID_AMOUNT');
  });

  it('always adds up to the total for random inputs', () => {
    for (let i = 0; i < 2000; i++) {
      const base = Math.floor(Math.random() * 10_000_000);
      const s = splitOrder(base, Math.random() < 0.5 ? 0 : 1800, Math.floor(Math.random() * 3000));
      expect(s.commissionPaise + s.commissionGstPaise + s.gymNetPaise).toBe(s.totalPaise);
      expect(s.gymNetPaise).toBeGreaterThanOrEqual(0);
    }
  });
});
