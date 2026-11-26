import { describe, it, expect } from 'vitest';
import { splitOrder, splitRefund } from '../src/services/commission';

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

describe('splitRefund', () => {
  const order = { totalPaise: 118000, commissionPaise: 10000, commissionGstPaise: 1800 };

  it('reverses a full refund line by line', () => {
    expect(splitRefund(order, 0, 118000)).toEqual({ commissionPaise: 10000, commissionGstPaise: 1800, gymNetPaise: 106200 });
  });

  it('reverses a part refund in proportion with the remainder on the gym', () => {
    // 1 x 1/3 = 0.33 -> 0, so the gym gives back the whole paisa
    expect(splitRefund({ totalPaise: 3, commissionPaise: 1, commissionGstPaise: 0 }, 0, 1)).toEqual({ commissionPaise: 0, commissionGstPaise: 0, gymNetPaise: 1 });
    // 10000 x 39333/118000 = 3333.3 -> 3333; 1800 x 39333/118000 = 599.99 -> 600
    expect(splitRefund(order, 0, 39333)).toEqual({ commissionPaise: 3333, commissionGstPaise: 600, gymNetPaise: 35400 });
  });

  it('rejects more than what is left', () => {
    expect(() => splitRefund(order, 100000, 18001)).toThrow('INVALID_AMOUNT');
    expect(() => splitRefund(order, 0, 0)).toThrow('INVALID_AMOUNT');
  });

  it('part refunds that add up to the order reverse every line exactly', () => {
    for (let i = 0; i < 500; i++) {
      const base = 1 + Math.floor(Math.random() * 5_000_000);
      const o = splitOrder(base, Math.random() < 0.5 ? 0 : 1800, Math.floor(Math.random() * 3000));
      let refunded = 0;
      const sums = { commissionPaise: 0, commissionGstPaise: 0, gymNetPaise: 0 };
      while (refunded < o.totalPaise) {
        const amount = Math.min(o.totalPaise - refunded, 1 + Math.floor(Math.random() * o.totalPaise));
        const r = splitRefund(o, refunded, amount);
        expect(r.commissionPaise + r.commissionGstPaise + r.gymNetPaise).toBe(amount);
        sums.commissionPaise += r.commissionPaise;
        sums.commissionGstPaise += r.commissionGstPaise;
        sums.gymNetPaise += r.gymNetPaise;
        refunded += amount;
      }
      expect(sums).toEqual({ commissionPaise: o.commissionPaise, commissionGstPaise: o.commissionGstPaise, gymNetPaise: o.gymNetPaise });
    }
  });
});
