import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

export const createWebsiteRequest = async (req: AuthRequest, res: Response) => {
  try {
    const gym = await prisma.gym.findFirst({ where: { ownerId: req.user!.userId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const { desiredSlug, note } = req.body;
    const taken = await prisma.gym.findFirst({ where: { subdomain: desiredSlug } });
    if (taken) return res.status(409).json({ error: 'That address is already taken' });

    const request = await prisma.$transaction(async (tx) => {
      // Per-gym lock: two quick submits with different slugs must not both land as PENDING.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`website-request:${gym.id}`}))`;
      const open = await tx.gymWebsiteRequest.findFirst({ where: { gymId: gym.id, status: 'PENDING' } });
      if (open) return null;
      return tx.gymWebsiteRequest.create({ data: { gymId: gym.id, desiredSlug, note } });
    });
    if (!request) return res.status(409).json({ error: 'You already have a pending website request' });
    res.status(201).json(request);
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'That address is already requested' });
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

export const listMyWebsiteRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.gymWebsiteRequest.findMany({
      where: { gym: { ownerId: req.user!.userId } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const listAllWebsiteRequests = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const requests = await prisma.gymWebsiteRequest.findMany({
      where: status ? { status } : {},
      include: { gym: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

const decide = (status: 'APPROVED' | 'REJECTED') => async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const request = await prisma.gymWebsiteRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(409).json({ error: 'Request already decided' });

    // Approval publishes the slug as the gym's subdomain, which the public gym page already uses.
    const updated = await prisma.$transaction(async (tx) => {
      // Conditional on PENDING so a double click can't decide the same request twice.
      const claimed = await tx.gymWebsiteRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status } });
      if (claimed.count === 0) return null;
      if (status === 'APPROVED') {
        await tx.gym.update({ where: { id: request.gymId }, data: { subdomain: request.desiredSlug } });
      }
      return tx.gymWebsiteRequest.findUnique({ where: { id } });
    });
    if (!updated) return res.status(409).json({ error: 'Request already decided' });

    await logAudit({
      userId: req.user?.userId ?? null,
      action: `WEBSITE_REQUEST_${status}`,
      entity: 'GymWebsiteRequest',
      entityId: id,
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'That address is already in use' });
    res.status(500).json({ error: 'Failed to update request' });
  }
};

export const approveWebsiteRequest = decide('APPROVED');
export const rejectWebsiteRequest = decide('REJECTED');
