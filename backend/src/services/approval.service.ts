import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { notifyGymOwner } from './notification.service';
import { findDuplicateGym } from '../utils/duplicateGym';

// Approval engine rules. Requests move only along TRANSITIONS; anything else
// is a 409 so a stale screen or a double click can't skip a step.

export class ApprovalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED'],
  CHANGES_REQUESTED: ['PENDING_REVIEW', 'CANCELLED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const assertTransition = (from: string, to: string) => {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new ApprovalError(409, 'INVALID_TRANSITION', `A request that is ${from} cannot become ${to}`);
  }
};

// shortcut: the protected fields and the price threshold are constants; move
// them to a platform setting when the admin needs to change them.
export const PROTECTED_GYM_FIELDS = ['name', 'address', 'city', 'state', 'phone', 'email', 'lat', 'lng', 'gstNumber', 'ownerId'] as const;
export const PRICE_CHANGE_LIMIT = 0.2;

const blankToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

// The protected fields an update really changes, with their new values.
export const protectedChanges = (current: Record<string, unknown>, update: Record<string, unknown>) => {
  const changes: Record<string, Prisma.InputJsonValue | null> = {};
  for (const field of PROTECTED_GYM_FIELDS) {
    if (update[field] === undefined) continue;
    if (blankToNull(update[field]) !== blankToNull(current[field])) changes[field] = blankToNull(update[field]) as Prisma.InputJsonValue | null;
  }
  return changes;
};

export const isLargePriceChange = (oldPrice: number, newPrice: number) =>
  oldPrice > 0 && Math.abs(newPrice - oldPrice) / oldPrice > PRICE_CHANGE_LIMIT;

const gymChangeKey = (gymId: string) => `GYM_PROFILE_CHANGE:Gym:${gymId}`;

// One open change request per gym: a second edit while one is waiting is
// merged into it instead of opening another.
export const submitGymChange = async (gym: { id: string } & Record<string, unknown>, changes: Prisma.InputJsonObject, userId: string) => {
  const current: Prisma.InputJsonObject = Object.fromEntries(Object.keys(changes).map((k) => [k, gym[k] ?? null]));
  const open = await prisma.approvalRequest.findUnique({ where: { openKey: gymChangeKey(gym.id) } });

  if (open) {
    return prisma.approvalRequest.update({
      where: { id: open.id },
      data: {
        currentValue: { ...(open.currentValue as object), ...current },
        proposedValue: { ...(open.proposedValue as object), ...changes },
        submittedAt: new Date(),
        events: { create: { fromStatus: open.status, toStatus: open.status, note: 'Request updated', actorId: userId } },
      },
    });
  }

  return prisma.$transaction((tx) =>
    createRequest(tx, {
      ref: `tmp-${gym.id}-${Date.now()}`,
      type: 'GYM_PROFILE_CHANGE',
      resourceType: 'Gym',
      resourceId: gym.id,
      gymId: gym.id,
      status: 'PENDING_REVIEW',
      openKey: gymChangeKey(gym.id),
      currentValue: current,
      proposedValue: changes,
      requesterId: userId,
      requesterRole: 'GYM_ADMIN',
      submittedAt: new Date(),
      events: { create: { toStatus: 'PENDING_REVIEW', actorId: userId } },
    }),
  );
};

// The ref comes from the row's sequence number, so it is set right after the insert.
const createRequest = async (tx: Prisma.TransactionClient, data: Prisma.ApprovalRequestUncheckedCreateInput) => {
  const created = await tx.approvalRequest.create({ data });
  return tx.approvalRequest.update({
    where: { id: created.id },
    data: { ref: `APR-${new Date().getFullYear()}-${String(created.seq).padStart(6, '0')}` },
  });
};

export const registrationKey = (gymId: string) => `GYM_REGISTRATION:Gym:${gymId}`;

// A new gym's application. The first submit opens the request; a resubmit after
// CHANGES_REQUESTED moves the same request back to review, keeping the last
// submission as currentValue so the admin sees what changed.
export const submitGymRegistration = async (gymId: string, proposed: Prisma.InputJsonObject, documentIds: string[], userId: string) =>
  prisma.$transaction(async (tx) => {
    const open = await tx.approvalRequest.findUnique({ where: { openKey: registrationKey(gymId) } });
    assertTransition(open?.status ?? 'DRAFT', 'PENDING_REVIEW');
    const documents = { create: documentIds.map((documentId) => ({ documentId })) };

    const request = open
      ? await tx.approvalRequest.update({
          where: { id: open.id },
          data: {
            status: 'PENDING_REVIEW',
            currentValue: open.proposedValue ?? Prisma.DbNull,
            proposedValue: proposed,
            submittedAt: new Date(),
            documents: { deleteMany: {}, ...documents },
            events: { create: { fromStatus: open.status, toStatus: 'PENDING_REVIEW', actorId: userId } },
          },
        })
      : await createRequest(tx, {
          ref: `tmp-${gymId}-${Date.now()}`,
          type: 'GYM_REGISTRATION',
          resourceType: 'Gym',
          resourceId: gymId,
          gymId,
          status: 'PENDING_REVIEW',
          openKey: registrationKey(gymId),
          proposedValue: proposed,
          requesterId: userId,
          requesterRole: 'GYM_ADMIN',
          submittedAt: new Date(),
          documents,
          events: { create: { fromStatus: 'DRAFT', toStatus: 'PENDING_REVIEW', actorId: userId } },
        });

    await tx.gym.update({ where: { id: gymId }, data: { status: 'PENDING_REVIEW', isApproved: false } });
    return request;
  });

export type Decision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export const decideRequest = async (id: string, decision: Decision, reviewerId: string, note?: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // Serialize competing reviewers before reading the current transition state.
    await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${id} FOR UPDATE`;
    const request = await tx.approvalRequest.findUnique({ where: { id } });
    if (!request) throw new ApprovalError(404, 'NOT_FOUND', 'Request not found');
    // Only an application goes back to the owner; a profile change is approved or rejected.
    if (decision === 'CHANGES_REQUESTED' && request.type !== 'GYM_REGISTRATION') {
      throw new ApprovalError(409, 'INVALID_TRANSITION', 'Only gym applications can be sent back for changes');
    }
    assertTransition(request.status, decision);

    if (request.type === 'GYM_REGISTRATION') {
      if (decision === 'APPROVED') {
        const gym = await tx.gym.findUnique({ where: { id: request.resourceId } });
        const duplicate = gym && (await findDuplicateGym(gym, gym.id));
        if (duplicate) throw new ApprovalError(409, 'DUPLICATE_GYM', duplicate.message);
      }
      await tx.gym.update({ where: { id: request.resourceId }, data: { status: decision, isApproved: decision === 'APPROVED' } });
    }

    if (decision === 'APPROVED' && request.type === 'GYM_PROFILE_CHANGE') {
      const proposed = request.proposedValue as Record<string, unknown>;
      const data = Object.fromEntries(PROTECTED_GYM_FIELDS.filter((f) => f in proposed).map((f) => [f, proposed[f]]));
      const current = await tx.gym.findUnique({ where: { id: request.resourceId } });
      const duplicate = await findDuplicateGym({ ...current, ...data }, request.resourceId);
      if (duplicate) throw new ApprovalError(409, 'DUPLICATE_GYM', duplicate.message);
      await tx.gym.update({ where: { id: request.resourceId }, data });
    }

    return tx.approvalRequest.update({
      where: { id },
      data: {
        status: decision,
        decidedAt: new Date(),
        reviewerId,
        reviewNote: note || null,
        // Sent back for changes, the request stays open for the resubmit.
        openKey: decision === 'CHANGES_REQUESTED' ? request.openKey : null,
        events: { create: { fromStatus: request.status, toStatus: decision, note: note || null, actorId: reviewerId } },
      },
    });
  });

  if (result.gymId) {
    await notifyGymOwner({ gymId: result.gymId, ...ownerMessage(result.type, decision, result.ref, note) });
  }
  return result;
};

const ownerMessage = (type: string, decision: Decision, ref: string, note?: string) => {
  const reason = note ? `: ${note}` : '.';
  if (type === 'GYM_REGISTRATION') {
    return {
      APPROVED: { type: 'SUCCESS' as const, title: 'Your gym is approved', message: 'Your gym is now listed on Kavach Fitness.', link: '/owner' },
      CHANGES_REQUESTED: { type: 'WARNING' as const, title: 'Changes needed on your application', message: `Please update application ${ref}${reason}`, link: '/partner/application' },
      REJECTED: { type: 'ERROR' as const, title: 'Your application was not approved', message: `Application ${ref} was rejected${reason}`, link: '/partner/application' },
    }[decision];
  }
  return decision === 'APPROVED'
    ? { type: 'SUCCESS' as const, title: 'Profile change approved', message: `Your change request ${ref} was approved and is now live.`, link: '/owner/profile' }
    : { type: 'WARNING' as const, title: 'Profile change rejected', message: `Your change request ${ref} was rejected${reason}`, link: '/owner/profile' };
};
