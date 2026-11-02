import { prisma } from '../utils/prisma';

export const DEFAULT_COMMISSION_BPS = 1000;
export const GST_BPS = 1800;

// Rounding: every line is rounded half-up to a whole paisa on its own
// (base x bps / 10000), and gymNet takes whatever is left, so
// commission + commissionGst + gymNet always equals total exactly.
const percentOf = (paise: number, bps: number) => Math.round((paise * bps) / 10000);

// base is the pre-GST plan price. GST is added on top for GST-registered gyms;
// commission is taken on base, Kavach charges 18% GST on its commission, and
// the Razorpay fee is not part of the split (the platform absorbs it).
export const splitOrder = (basePaise: number, gstRateBps: number, commissionBps: number) => {
  for (const n of [basePaise, gstRateBps, commissionBps]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('INVALID_AMOUNT');
  }
  if (commissionBps > 10000) throw new Error('INVALID_AMOUNT');

  const gstPaise = percentOf(basePaise, gstRateBps);
  const totalPaise = basePaise + gstPaise;
  const commissionPaise = percentOf(basePaise, commissionBps);
  const commissionGstPaise = percentOf(commissionPaise, GST_BPS);
  const gymNetPaise = totalPaise - commissionPaise - commissionGstPaise;
  if (gymNetPaise < 0) throw new Error('INVALID_AMOUNT');
  return { basePaise, gstPaise, totalPaise, commissionPaise, commissionGstPaise, gymNetPaise };
};

// The gym's own rule if it has one, else the platform default row, else 10%.
export const commissionBpsForGym = async (gymId: string) => {
  const rules = await prisma.commissionRule.findMany({ where: { OR: [{ gymId }, { gymId: null }] } });
  const rule = rules.find((r) => r.gymId === gymId) ?? rules.find((r) => r.gymId === null);
  return rule?.percentBps ?? DEFAULT_COMMISSION_BPS;
};
