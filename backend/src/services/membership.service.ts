import { prisma } from '../utils/prisma';
import { createNotification, notifyGymOwner } from './notification.service';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const EXPIRING_SOON_DAYS = 7;

// Marks ACTIVE memberships whose end date has passed as EXPIRED.
export const syncExpiredMemberships = async () => {
  const now = new Date();
  const result = await prisma.membership.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
};

// Derives a display status: PENDING / ACTIVE / EXPIRING_SOON / EXPIRED / SUSPENDED / CANCELLED
export const deriveMembershipStatus = (m: {
  status: string;
  startDate: Date;
  endDate: Date;
}): string => {
  if (m.status !== 'ACTIVE') return m.status;
  const now = Date.now();
  if (m.endDate.getTime() < now) return 'EXPIRED';
  if (m.endDate.getTime() - now <= EXPIRING_SOON_DAYS * DAY_MS) return 'EXPIRING_SOON';
  return 'ACTIVE';
};

export const withDerivedStatus = <T extends { status: string; startDate: Date; endDate: Date }>(m: T) => ({
  ...m,
  lifecycleStatus: deriveMembershipStatus(m),
});

type BaseMembershipInput = {
  memberId: string;
  gymId: string;
  planId?: string | null;
  discount?: number;
  paymentMethod?: string | null;
  transactionId?: string | null;
  notes?: string | null;
};

export type CreateMembershipInput = BaseMembershipInput & {
  startDate?: string;
  paymentStatus?: string;
};

const resolvePlan = async (planId: string | null | undefined, gymId: string) => {
  if (!planId) return null;
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('PLAN_NOT_FOUND');
  if (plan.gymId !== gymId) throw new Error('PLAN_GYM_MISMATCH');
  return plan;
};

const resolveMember = async (memberId: string, gymId: string) => {
  const member = await prisma.memberDetails.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!member || member.gymId !== gymId) throw new Error('MEMBER_NOT_FOUND');
  return member;
};

const createFeeForMembership = async (params: {
  memberId: string;
  gymId: string;
  membershipId: string;
  amount: number;
  dueDate: Date;
  paymentStatus: string;
  paymentMethod: string | null | undefined;
  transactionId: string | null | undefined;
  notes: string | null | undefined;
}) => {
  if (params.amount <= 0) return null;
  return prisma.fee.create({
    data: {
      memberId: params.memberId,
      gymId: params.gymId,
      membershipId: params.membershipId,
      amount: params.amount,
      paymentDate: new Date(),
      dueDate: params.dueDate,
      status: params.paymentStatus === 'PAID' ? 'PAID' : params.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
      paymentMethod: params.paymentMethod ?? null,
      transactionId: params.transactionId ?? null,
      notes: params.notes ?? null,
    },
  });
};

export const createMembership = async (input: CreateMembershipInput) => {
  const { memberId, gymId, planId } = input;
  const [plan, member] = await Promise.all([
    resolvePlan(planId, gymId),
    resolveMember(memberId, gymId),
  ]);

  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) throw new Error('INVALID_DATE');

  const durationDays = plan?.duration ?? 30;
  const endDate = new Date(startDate.getTime() + durationDays * DAY_MS);

  const originalAmount = plan?.price ? plan.price.toNumber() : 0;
  const discount = Math.min(input.discount ?? 0, originalAmount);
  const finalAmount = Math.max(0, originalAmount - discount);
  const paymentStatus = input.paymentStatus ?? (finalAmount > 0 ? 'PENDING' : 'PAID');

  const membership = await prisma.membership.create({
    data: {
      memberId,
      gymId,
      planId: planId ?? null,
      startDate,
      endDate,
      originalAmount,
      discount,
      finalAmount,
      paymentStatus,
      status: 'ACTIVE',
      paymentMethod: input.paymentMethod ?? null,
      transactionId: input.transactionId ?? null,
      notes: input.notes ?? null,
    },
    include: { plan: true },
  });

  await prisma.memberDetails.update({
    where: { id: memberId },
    data: { planId: planId ?? null, status: 'ACTIVE' },
  });

  await createFeeForMembership({
    memberId,
    gymId,
    membershipId: membership.id,
    amount: finalAmount,
    dueDate: endDate,
    paymentStatus,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId,
    notes: input.notes,
  });

  await createNotification({
    userId: member.userId,
    type: 'SUCCESS',
    title: 'Membership activated',
    message: `Your ${plan?.name ?? 'membership'} is now active until ${endDate.toLocaleDateString('en-IN')}.`,
    link: '/dashboard',
  });

  await notifyGymOwner({
    gymId,
    type: 'INFO',
    title: 'Membership created',
    message: `A membership was created for ${member.user.username}.`,
  });

  return withDerivedStatus(membership);
};

export type RenewMembershipInput = BaseMembershipInput & {
  membershipId: string;
};

export const renewMembership = async (input: RenewMembershipInput) => {
  const { membershipId, gymId } = input;
  const prev = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { member: { select: { userId: true } }, plan: true },
  });
  if (!prev || prev.gymId !== gymId) throw new Error('MEMBERSHIP_NOT_FOUND');

  const planId = input.planId ?? prev.planId;
  const plan = await resolvePlan(planId, gymId);

  // Renewal starts from the later of "now" or the previous expiry date so no
  // overlap or gap is created when renewing before expiry.
  const startMs = Math.max(Date.now(), prev.endDate.getTime());
  const startDate = new Date(startMs);
  const durationDays = plan?.duration ?? (Math.round((prev.endDate.getTime() - prev.startDate.getTime()) / DAY_MS) || 30);
  const endDate = new Date(startMs + durationDays * DAY_MS);

  const originalAmount = plan?.price ? plan.price.toNumber() : prev.finalAmount.toNumber();
  const discount = Math.min(input.discount ?? 0, originalAmount);
  const finalAmount = Math.max(0, originalAmount - discount);
  const paymentStatus = finalAmount > 0 ? 'PENDING' : 'PAID';

  const renewal = await prisma.membership.create({
    data: {
      memberId: prev.memberId,
      gymId,
      planId: planId ?? null,
      startDate,
      endDate,
      originalAmount,
      discount,
      finalAmount,
      paymentStatus,
      status: 'ACTIVE',
      paymentMethod: input.paymentMethod ?? null,
      transactionId: input.transactionId ?? null,
      notes: input.notes ?? null,
      isRenewal: true,
      previousMembershipId: prev.id,
    },
    include: { plan: true },
  });

  await prisma.memberDetails.update({
    where: { id: prev.memberId },
    data: { planId: planId ?? null, status: 'ACTIVE' },
  });

  await createFeeForMembership({
    memberId: prev.memberId,
    gymId,
    membershipId: renewal.id,
    amount: finalAmount,
    dueDate: endDate,
    paymentStatus,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId,
    notes: input.notes,
  });

  await createNotification({
    userId: prev.member.userId,
    type: 'SUCCESS',
    title: 'Membership renewed',
    message: `Your ${plan?.name ?? 'membership'} has been renewed until ${endDate.toLocaleDateString('en-IN')}.`,
    link: '/dashboard',
  });

  return withDerivedStatus(renewal);
};
