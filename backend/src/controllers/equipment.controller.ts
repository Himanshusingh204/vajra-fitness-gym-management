import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

// List equipment for a gym
export const getEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { condition } = req.query as { condition?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId };
    if (condition) where.condition = condition;

    const equipment = await prisma.equipment.findMany({
      where,
      include: { maintenanceLogs: { orderBy: { date: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' },
    });

    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

// Add equipment
export const addEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name, serialNumber, purchaseDate, purchaseCost, warrantyExpiry, location, notes } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const equipment = await prisma.equipment.create({
      data: {
        gymId,
        name,
        serialNumber: serialNumber ?? null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost ?? null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        location: location ?? null,
        notes: notes ?? null,
      },
    });

    await logAudit({
      action: 'EQUIPMENT_ADDED',
      entity: 'Equipment',
      entityId: equipment.id,
      details: JSON.stringify({ name }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add equipment' });
  }
};

// Update equipment
export const updateEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    if (equipment.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, serialNumber, purchaseDate, purchaseCost, warrantyExpiry, location, condition, notes } = req.body;

    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(serialNumber !== undefined ? { serialNumber } : {}),
        ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
        ...(purchaseCost !== undefined ? { purchaseCost } : {}),
        ...(warrantyExpiry !== undefined ? { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(condition !== undefined ? { condition } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment' });
  }
};

// Record maintenance
export const recordMaintenance = async (req: AuthRequest, res: Response) => {
  try {
    const equipmentId = req.params.id as string;
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    if (equipment.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { type, description, cost, nextDue } = req.body;

    const log = await prisma.equipmentMaintenance.create({
      data: {
        equipmentId,
        type,
        description,
        cost: cost ?? 0,
        nextDue: nextDue ? new Date(nextDue) : null,
      },
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record maintenance' });
  }
};

// Delete equipment
export const deleteEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    if (equipment.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.equipment.delete({ where: { id } });
    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
};
