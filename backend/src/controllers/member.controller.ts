import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import argon2 from 'argon2';
import { logAudit } from '../utils/audit';
import { prisma } from '../utils/prisma';
import { getOrSetJSON } from '../utils/cache';
import { generateSecureToken, hashToken, TOKEN_TTL } from '../utils/tokens';
import { FRONTEND_URL } from '../utils/env';
import { logger } from '../utils/logger';
import { notifyGymOwner } from '../services/notification.service';
import { createMembership } from '../services/membership.service';
import { sendActivationEmail } from '../utils/email';
import { assertGymCapacity } from '../services/entitlements.service';
import { canAccessGym, findMemberProfile, requestedGymId } from '../utils/tenant';

const MAX_IMPORT_ROWS = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal RFC-4180-ish CSV parser: handles quoted fields and embedded commas.
const parseCsvRows = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field.trim());
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field.trim());
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field.trim());
    if (row.some((f) => f !== '')) rows.push(row);
  }
  return rows;
};

// Bulk CSV member import (Gym Admin / Super Admin). Expects a header row of
// username,email,phone — imports transactionally, sends activation links, and
// returns a per-row summary. Duplicate emails (in-file or existing) are skipped.
export const importMembers = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { csv, planId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId))) return res.status(403).json({ error: 'Unauthorized' });

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.gymId !== gymId) return res.status(400).json({ error: 'Plan does not belong to this gym' });
    }

    const rawRows = parseCsvRows(csv);
    if (rawRows.length < 2) return res.status(400).json({ error: 'CSV must contain a header row and at least one data row' });
    if (rawRows.length - 1 > MAX_IMPORT_ROWS) {
      return res.status(400).json({ error: `Import limited to ${MAX_IMPORT_ROWS} members per request` });
    }

    const header = rawRows[0]!.map((h) => h.toLowerCase().replace(/[\s-]+/g, '_'));
    const usernameIdx = header.indexOf('username');
    const emailIdx = header.indexOf('email');
    if (usernameIdx === -1 || emailIdx === -1) {
      return res.status(400).json({ error: 'CSV header must include username and email columns (phone optional)' });
    }
    const phoneIdx = header.indexOf('phone');

    // Normalize + validate rows, dedupe emails within the file.
    const seen = new Map<string, number>(); // email -> row number
    const rows: Array<{ username: string; email: string; phone: string | null; row: number; error?: string }> = [];
    rawRows.slice(1).forEach((r, i) => {
      const rowNum = i + 2; // 1-based including header
      const username = (r[usernameIdx] ?? '').trim();
      const email = (r[emailIdx] ?? '').trim().toLowerCase();
      const phone = phoneIdx !== -1 ? (r[phoneIdx] ?? '').trim() || null : null;

      if (!email || !EMAIL_RE.test(email)) {
        rows.push({ username, email, phone, row: rowNum, error: 'Invalid or missing email' });
        return;
      }
      if (username.length < 2 || username.length > 60) {
        rows.push({ username, email, phone, row: rowNum, error: 'Invalid username (2-60 chars)' });
        return;
      }
      if (phone && (phone.length < 5 || phone.length > 20)) {
        rows.push({ username, email, phone, row: rowNum, error: 'Invalid phone' });
        return;
      }
      if (seen.has(email)) {
        rows.push({ username, email, phone, row: rowNum, error: `Duplicate email in file (also row ${seen.get(email)})` });
        return;
      }
      seen.set(email, rowNum);
      rows.push({ username, email, phone, row: rowNum });
    });

    const validRows = rows.filter((r) => !r.error);

    // Skip emails that already exist in the platform.
    const existing = await prisma.user.findMany({
      where: { email: { in: validRows.map((r) => r.email) } },
      select: { email: true },
    });
    const existingEmails = new Set(existing.map((u) => u.email));
    const toImport = validRows.filter((r) => {
      if (existingEmails.has(r.email)) {
        r.error = 'Email already registered';
        return false;
      }
      return true;
    });

    // Enforce the SaaS plan's member capacity for the whole batch up-front.
    if (req.user?.role !== 'SUPER_ADMIN' && toImport.length > 0) {
      try {
        await assertGymCapacity(gymId, { addMembers: toImport.length });
      } catch (err: any) {
        if (err?.name === 'EntitlementError') {
          return res.status(402).json({ error: err.message.split(':')[2] });
        }
        throw err;
      }
    }

    // Transactional insert of the valid, new members.
    const created: Array<{ username: string; email: string; token: string }> = [];
    if (toImport.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const r of toImport) {
          const user = await tx.user.create({
            data: {
              username: r.username,
              email: r.email,
              phone: r.phone,
              password: await argon2.hash(generateSecureToken(24)),
              role: 'MEMBER',
              memberProfiles: { create: { gymId, planId: planId ?? null, status: 'PENDING' } },
            },
          });
          const token = generateSecureToken();
          await tx.activationToken.create({
            data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL.activation) },
          });
          created.push({ username: r.username, email: r.email, token });
        }
      });
    }

    // Send activation emails (best-effort; failures are logged, not fatal).
    // The token was captured during creation above — no need to look it back up.
    await Promise.allSettled(
      created.map(async (c) => {
        const link = `${FRONTEND_URL}/activate?token=${c.token}`;
        await sendActivationEmail(c.email, c.username, link);
      }),
    ).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') logger.warn('activation email failed', { email: created[i]?.email, error: String(r.reason) });
      });
    });

    await logAudit({
      action: 'MEMBERS_IMPORTED',
      entity: 'MemberDetails',
      entityId: gymId,
      details: JSON.stringify({ imported: created.length, total: rows.length }),
      userId: req.user?.userId ?? null,
    });

    await notifyGymOwner({
      gymId,
      type: 'INFO',
      title: 'Members imported',
      message: `${created.length} member(s) imported from CSV.`,
    });

    res.status(201).json({
      imported: created.length,
      skipped: rows.length - created.length,
      errors: rows.filter((r) => r.error).map((r) => ({ row: r.row, email: r.email || null, error: r.error })),
    });
  } catch (error) {
    logger.errorWith('Failed to import members', error);
    res.status(500).json({ error: 'Failed to import members' });
  }
};


// Get all members for a gym (Gym Admin, Super Admin, or Trainer at that gym)
export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { branchId } = req.query;
    
    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!(await canAccessGym(req.user, gymId, ['TRAINER', 'STAFF']))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Trainers and staff need member names for workout/booking context but not
    // full PII (email/phone). Only the gym owner and super admin see those.
    const isOwner = await canAccessGym(req.user, gymId);

    const where: any = { gymId };
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: String(branchId), gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
      where.branchId = branchId;
    }

    // Frontend polls this every 30s across several dashboard tabs — cache
    // briefly so repeat polls hit Redis instead of the DB (same pattern as
    // gym-stats). Keyed on isOwner too since the included PII differs.
    const members = await getOrSetJSON(`members:${gymId}:${branchId ?? 'all'}:${isOwner}`, 15, () =>
      prisma.memberDetails.findMany({
        where,
        include: {
          user: {
            select: isOwner
              ? { id: true, username: true, email: true, phone: true }
              : { id: true, username: true },
          },
          membershipPlan: true,
          branch: { select: { id: true, name: true } },
        },
        orderBy: { joiningDate: 'desc' },
        take: 1000,
      }),
    );
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

// Add a member directly by Gym Admin
export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { username, email, phone, planId, status, branchId } = req.body;

    if (!(await canAccessGym(req.user, gymId))) return res.status(403).json({ error: 'Unauthorized' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to this gym' });
    }

    if (planId) {
      const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, gymId }, select: { id: true } });
      if (!plan) return res.status(400).json({ error: 'Plan does not belong to this gym' });
    }

    // Enforce the gym's SaaS plan capacity before creating another member.
    if (req.user?.role !== 'SUPER_ADMIN') {
      try {
        await assertGymCapacity(gymId, { addMembers: 1 });
      } catch (err: any) {
        if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
        throw err;
      }
    }

    // No universal default password: the member activates their own password
    // through a one-time secure link.
    const placeholderPassword = await argon2.hash(generateSecureToken(24));

    const member = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: placeholderPassword,
        role: 'MEMBER',
        memberProfiles: {
          create: {
            gymId,
            planId,
            branchId: branchId || null,
            status: status || 'PENDING',
          },
        },
      },
      include: { memberProfiles: true },
    });

    const activationToken = generateSecureToken();
    await prisma.activationToken.create({
      data: {
        tokenHash: hashToken(activationToken),
        userId: member.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
      },
    });

    // Best-effort; the member record and activation link already exist, so an
    // email failure (bad SMTP config, provider outage) shouldn't roll back an
    // otherwise-successful creation — see the bulk-import path above for the
    // same pattern.
    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;
    await sendActivationEmail(email, username, activationLink).catch((err) =>
      logger.warn('activation email failed', { email, error: String(err) }),
    );

    await notifyGymOwner({
      gymId,
      type: 'INFO',
      title: 'Member added',
      message: `${username} was added as a member.`,
    });

    const { password: _pw, memberProfiles, ...safeMember } = member;
    res.status(201).json({ ...safeMember, memberDetails: memberProfiles[0], activationLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// Generates a fresh activation link for a member (Gym Admin / Super Admin)
export const sendActivationLink = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });
    if (!(await canAccessGym(req.user, memberDetails.gymId))) return res.status(403).json({ error: 'Unauthorized' });

    // Invalidate any previous unused activation tokens for this user.
    await prisma.activationToken.deleteMany({
      where: { userId: memberDetails.userId, usedAt: null },
    });

    const activationToken = generateSecureToken();
    await prisma.activationToken.create({
      data: {
        tokenHash: hashToken(activationToken),
        userId: memberDetails.userId,
        expiresAt: new Date(Date.now() + TOKEN_TTL.activation),
      },
    });

    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;
    await sendActivationEmail(memberDetails.user.email, memberDetails.user.username, activationLink).catch((err) =>
      logger.warn('activation email failed', { email: memberDetails.user.email, error: String(err) }),
    );

    res.json({ activationLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate activation link' });
  }
};

// Get a specific member by ID (Super Admin, owning Gym Admin, or the member themself)
export const getMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, phone: true } },
        membershipPlan: true,
        gym: { select: { id: true, name: true, ownerId: true } },
      },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });

    const isSelf = memberDetails.userId === req.user?.userId;
    if (!isSelf && !(await canAccessGym(req.user, memberDetails.gymId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(memberDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};

// Let a logged-in member join a gym / submit a membership request
export const enrollMember = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { gymId, planId, preferredPaymentMethod } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.status !== 'APPROVED') return res.status(404).json({ error: 'Gym not found' });

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
      if (plan.gymId !== gym.id) return res.status(400).json({ error: 'Plan does not belong to the selected gym' });
    }

    // Joining another gym adds a row; the user's memberships at other gyms stay as they are.
    const existing = await prisma.memberDetails.findUnique({ where: { userId_gymId: { userId, gymId } } });

    if (existing?.status === 'ACTIVE') {
      return res.status(409).json({ error: 'You are already a member of this gym', code: 'ALREADY_MEMBER' });
    }

    if (existing) {
      const updated = await prisma.memberDetails.update({
        where: { id: existing.id },
        data: {
          planId: planId || null,
          status: 'PENDING',
          ...(preferredPaymentMethod !== undefined ? { preferredPaymentMethod: preferredPaymentMethod || null } : {}),
        },
      });
      return res.json({ message: 'Membership request updated, pending approval.', member: updated });
    }

    const member = await prisma.memberDetails.create({
      data: {
        userId,
        gymId,
        planId: planId || undefined,
        status: 'PENDING',
        ...(preferredPaymentMethod !== undefined ? { preferredPaymentMethod: preferredPaymentMethod || null } : {}),
      },
    });
    res.status(201).json({ message: 'Membership request submitted, pending approval.', member });
  } catch {
    res.status(500).json({ error: 'Failed to submit membership request' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const profile = await findMemberProfile(userId, requestedGymId(req));
    const memberDetails = profile
      ? await prisma.memberDetails.findUnique({ where: { id: profile.id }, include: { gym: true, membershipPlan: true } })
      : null;

    if (!memberDetails) return res.status(404).json({ error: 'Profile not found' });
    res.json(memberDetails);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
// Update member status or plan (Gym Admin for their gym, or Super Admin)
export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const { status, planId, branchId } = req.body;

    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id: memberId },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });
    if (!(await canAccessGym(req.user, memberDetails.gymId))) return res.status(403).json({ error: 'Unauthorized' });

    if (planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan || plan.gymId !== memberDetails.gymId) {
        return res.status(400).json({ error: 'Plan does not belong to the member\'s gym' });
      }
    }

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId: memberDetails.gymId } });
      if (!branch) return res.status(400).json({ error: 'Branch does not belong to the member\'s gym' });
    }

    const updated = await prisma.memberDetails.update({
      where: { id: memberId },
      data: { status, planId, ...(branchId !== undefined ? { branchId: branchId || null } : {}) },
    });

    // When a member is approved (or re-activated), make sure they actually get a
    // Membership record so it shows up on their dashboard. Approval alone used to
    // only flip MemberDetails.status, which left GET /memberships/my empty.
    if (status === 'ACTIVE') {
      const existing = await prisma.membership.findFirst({
        where: { memberId, status: { in: ['PENDING', 'ACTIVE'] } },
      });
      if (!existing) {
        await createMembership({
          memberId,
          gymId: memberDetails.gymId,
          planId: planId ?? memberDetails.planId ?? null,
          paymentMethod: memberDetails.preferredPaymentMethod,
        });
      }
    }

    await logAudit({
      action: 'MEMBER_UPDATED',
      entity: 'MemberDetails',
      entityId: memberId,
      details: JSON.stringify({ status, planId }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
};

// Remove a member from a gym (their Gym Admin, or Super Admin). Cascades clean
// up the member's fees, memberships, attendance and workout slips at that gym.
// The account itself is deleted only when this was its last gym.
export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.id as string;

    const memberDetails = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { gym: { select: { name: true } } },
    });
    if (!memberDetails) return res.status(404).json({ error: 'Member not found' });
    if (!(await canAccessGym(req.user, memberDetails.gymId))) return res.status(403).json({ error: 'Unauthorized' });

    const otherGyms = await prisma.memberDetails.count({ where: { userId: memberDetails.userId, id: { not: memberId } } });
    if (otherGyms > 0) {
      await prisma.$transaction([
        prisma.booking.deleteMany({ where: { userId: memberDetails.userId, gymId: memberDetails.gymId } }),
        prisma.memberDetails.delete({ where: { id: memberId } }),
      ]);
    } else {
      await prisma.user.delete({ where: { id: memberDetails.userId } });
    }

    await logAudit({
      action: 'MEMBER_DELETED',
      entity: 'MemberDetails',
      entityId: memberId,
      details: JSON.stringify({ gym: memberDetails.gym.name }),
      userId: req.user?.userId ?? null,
    });

    res.json({ message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
};

// Every gym the signed-in user is a member of, the default one (latest active membership) first.
export const getMyGyms = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const rows = await prisma.memberDetails.findMany({
      where: { userId },
      select: {
        id: true,
        gymId: true,
        status: true,
        joiningDate: true,
        gym: { select: { id: true, name: true, city: true, logoUrl: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: { id: true, status: true, startDate: true, endDate: true, planId: true },
        },
      },
      orderBy: { joiningDate: 'desc' },
    });
    const started = (r: (typeof rows)[number]) => r.memberships[0]?.startDate.getTime() ?? -Infinity;
    rows.sort((a, b) => started(b) - started(a));
    res.json(rows.map(({ id, memberships, ...r }) => ({ memberId: id, ...r, activeMembership: memberships[0] ?? null })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
};
