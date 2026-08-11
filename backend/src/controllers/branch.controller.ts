import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { assertGymCapacity, isFeatureEnabled } from '../services/entitlements.service';
import { createNotification } from '../services/notification.service';

const requireSuperAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    return false;
  }
  return true;
};

// =====================================================================
// BRANCH / MULTI-LOCATION CONTROLLER
// Routes: branch.routes.ts
// Responsibilities: branch CRUD for gyms with multiple physical locations.
// Tenant safety: every operation verifies the branch belongs to the caller's
// gym (or the caller is SUPER_ADMIN).
// =====================================================================

// Helper: verify the requesting user owns the gym (or is SUPER_ADMIN).
const assertGymOwner = async (gymId: string, userId: string | undefined, role: string | undefined) => {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true, ownerId: true } });
  if (!gym) return false;
  if (role === 'SUPER_ADMIN') return true;
  return gym.ownerId === userId;
};

// List branches for a gym (Gym Admin / Super Admin). Includes per-branch
// headcounts so the dashboard can show load at a glance.
export const getBranches = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const branches = await prisma.branch.findMany({
      where: { gymId },
      include: {
        _count: {
          select: { members: { where: { status: { not: 'PENDING' } } }, trainers: true, staff: true, classes: { where: { isActive: true } } },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });

    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

// Submit a new branch for approval (Gym Admin / Super Admin). The first
// branch is allowed on every plan (it is the gym's home location);
// additional branches require the MULTI_BRANCH feature and fit within the
// plan's maxBranches limit. New branches start PENDING and inactive — a
// Super Admin must approve them before members/staff/classes can be assigned.
export const createBranch = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name, address, city, state, phone } = req.body;

    if (!(await assertGymOwner(gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const activeBranchCount = await prisma.branch.count({ where: { gymId, isActive: true } });

    if (activeBranchCount > 0 && !(await isFeatureEnabled(gymId, 'MULTI_BRANCH'))) {
      return res.status(403).json({ error: 'Multi-branch support requires an upgraded plan' });
    }

    try {
      await assertGymCapacity(gymId, { addBranches: 1 });
    } catch (err: any) {
      if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
      throw err;
    }

    const branch = await prisma.branch.create({
      data: { gymId, name, address, city, state, phone: phone || null, status: 'PENDING', isActive: false },
    });

    await logAudit({
      action: 'BRANCH_SUBMITTED',
      entity: 'Branch',
      entityId: branch.id,
      details: JSON.stringify({ name, city }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit branch' });
  }
};

// Update a branch (Gym Admin / Super Admin).
export const updateBranch = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, address, city, state, phone, isActive } = req.body;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (!(await assertGymOwner(branch.gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // A Gym Admin can't flip a PENDING/REJECTED branch active themselves —
    // that would bypass the approval workflow. Only the approve/reject
    // endpoints (Super Admin) may change status; this endpoint only toggles
    // isActive on branches that are already APPROVED.
    if (isActive !== undefined && req.user?.role !== 'SUPER_ADMIN' && branch.status !== 'APPROVED') {
      return res.status(403).json({ error: 'This branch is awaiting Super Admin approval and cannot be activated yet' });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    await logAudit({
      action: 'BRANCH_UPDATED',
      entity: 'Branch',
      entityId: branch.id,
      details: JSON.stringify({ isActive }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
};

// Soft-disable a branch (Gym Admin / Super Admin). A gym must always keep at
// least one active branch, and disabling requires the branch to be empty of
// active members.
export const deleteBranch = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (!(await assertGymOwner(branch.gymId, req.user?.userId, req.user?.role))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!branch.isActive) return res.json({ ...branch, isActive: false });

    const activeBranchCount = await prisma.branch.count({ where: { gymId: branch.gymId, isActive: true } });
    if (activeBranchCount <= 1) {
      return res.status(400).json({ error: 'Your gym must have at least one active branch' });
    }

    const activeMembers = await prisma.memberDetails.count({
      where: { branchId: branch.id, status: { not: 'PENDING' } },
    });
    if (activeMembers > 0) {
      return res.status(400).json({ error: `Cannot disable this branch — ${activeMembers} member(s) are still assigned to it. Reassign them first.` });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      action: 'BRANCH_DISABLED',
      entity: 'Branch',
      entityId: branch.id,
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable branch' });
  }
};

// Super Admin: list branches awaiting approval, across all gyms.
export const getPendingBranches = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const branches = await prisma.branch.findMany({
      where: { status: 'PENDING' },
      include: { gym: { select: { id: true, name: true, city: true, owner: { select: { username: true, email: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending branches' });
  }
};

// Super Admin: approve a pending branch, making it active and usable. Plan
// capacity is re-checked here (not just at submission time) since this is
// the moment the branch actually starts consuming the gym's branch quota.
export const approveBranch = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const branch = await prisma.branch.findUnique({ where: { id }, include: { gym: { select: { ownerId: true, name: true } } } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (branch.status !== 'PENDING') return res.status(400).json({ error: 'This branch has already been reviewed' });

    const activeBranchCount = await prisma.branch.count({ where: { gymId: branch.gymId, isActive: true } });
    if (activeBranchCount > 0 && !(await isFeatureEnabled(branch.gymId, 'MULTI_BRANCH'))) {
      return res.status(402).json({ error: "This gym's plan doesn't include multi-branch support — ask them to upgrade before approving." });
    }
    try {
      await assertGymCapacity(branch.gymId, { addBranches: 1 });
    } catch (err: any) {
      if (err?.name === 'EntitlementError') return res.status(402).json({ error: err.message.split(':')[2] });
      throw err;
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { status: 'APPROVED', isActive: true, reviewedAt: new Date(), reviewedBy: req.user?.userId ?? null, rejectionReason: null },
    });

    await createNotification({
      userId: branch.gym.ownerId,
      type: 'SUCCESS',
      title: 'Branch approved',
      message: `Your branch "${branch.name}" is now approved and live.`,
      link: '/admin/gym',
    });

    await logAudit({
      action: 'BRANCH_APPROVED',
      entity: 'Branch',
      entityId: id,
      details: JSON.stringify({ name: branch.name, gym: branch.gym.name }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve branch' });
  }
};

// Super Admin: reject a pending branch, with an optional reason shown to the
// gym owner.
export const rejectBranch = async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = req.params.id as string;
    const { reason } = req.body as { reason?: string };
    const branch = await prisma.branch.findUnique({ where: { id }, include: { gym: { select: { ownerId: true, name: true } } } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (branch.status !== 'PENDING') return res.status(400).json({ error: 'This branch has already been reviewed' });

    const updated = await prisma.branch.update({
      where: { id },
      data: { status: 'REJECTED', isActive: false, reviewedAt: new Date(), reviewedBy: req.user?.userId ?? null, rejectionReason: reason || null },
    });

    await createNotification({
      userId: branch.gym.ownerId,
      type: 'ERROR',
      title: 'Branch request rejected',
      message: `Your branch "${branch.name}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/admin/gym',
    });

    await logAudit({
      action: 'BRANCH_REJECTED',
      entity: 'Branch',
      entityId: id,
      details: JSON.stringify({ name: branch.name, gym: branch.gym.name, reason }),
      userId: req.user?.userId ?? null,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject branch' });
  }
};
