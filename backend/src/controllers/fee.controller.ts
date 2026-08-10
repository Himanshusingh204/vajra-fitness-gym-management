import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { sendPdf, buildFeeReceipt } from '../utils/pdf';
import { createNotification, notifyGymOwner } from '../services/notification.service';

// Get all fees for a gym
export const getFees = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    
    // Gym Admin validation
    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const fees = await prisma.fee.findMany({
      where: { gymId },
      include: {
        member: {
          include: { user: { select: { username: true, email: true } } }
        }
      },
      orderBy: { dueDate: 'desc' }
    });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
};

// Record a new fee payment
export const recordFee = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { memberId, amount, paymentDate, dueDate, status, paymentMethod, transactionId, notes, membershipId } =
      req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.ownerId !== req.user?.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const member = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!member || member.gymId !== gymId) {
      return res.status(400).json({ error: 'Invalid member' });
    }

    if (membershipId) {
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (!membership || membership.memberId !== memberId || membership.gymId !== gymId) {
        return res.status(400).json({ error: 'Invalid membership for this member' });
      }
    }

    const fee = await prisma.fee.create({
      data: {
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: new Date(dueDate),
        status: status || 'PAID',
        paymentMethod: paymentMethod ?? null,
        transactionId: transactionId ?? null,
        notes: notes ?? null,
        membershipId: membershipId ?? null,
        memberId,
        gymId,
      },
      include: { membership: true },
    });

    await createNotification({
      userId: member.user.id,
      type: status === 'PAID' ? 'SUCCESS' : 'INFO',
      title: status === 'PAID' ? 'Payment received' : 'Fee recorded',
      message:
        status === 'PAID'
          ? `A payment of ₹${amount} has been recorded.`
          : `A fee of ₹${amount} has been recorded with status ${status ?? 'PAID'}.`,
      link: '/dashboard',
    });

    res.status(201).json(fee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record fee' });
  }
};

// Update fee status or payment details
export const updateFeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, paymentMethod, transactionId, notes } = req.body;

    if (!status || !['PENDING', 'PAID', 'OVERDUE', 'PARTIAL'].includes(status)) {
      return res.status(400).json({ error: 'Invalid fee status' });
    }

    const fee = await prisma.fee.findUnique({
      where: { id },
      include: {
        gym: { select: { ownerId: true } },
        member: { include: { user: { select: { id: true } } } },
      },
    });
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = fee.gym.ownerId === req.user?.userId;
    if (!isSuperAdmin && !isGymOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedFee = await prisma.fee.update({
      where: { id },
      data: {
        status,
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(transactionId !== undefined ? { transactionId } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    await createNotification({
      userId: fee.member.user.id,
      type: status === 'PAID' ? 'SUCCESS' : 'INFO',
      title: 'Fee status updated',
      message: `Your fee of ₹${fee.amount} is now ${status}.`,
      link: '/dashboard',
    });

    res.json(updatedFee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fee' });
  }
};

// Get fees for a specific member (member self, their gym owner, or Super Admin)
export const getMemberFees = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;

    const member = await prisma.memberDetails.findUnique({
      where: { id: memberId },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = member.gym.ownerId === req.user?.userId;
    const isSelf = member.userId === req.user?.userId;
    if (!isSuperAdmin && !isGymOwner && !isSelf) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const fees = await prisma.fee.findMany({
      where: { memberId, gymId: member.gymId },
      orderBy: { dueDate: 'desc' },
    });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
};

// Download fee receipt as a PDF (member self, their gym owner, or Super Admin)
export const getFeeReceiptPDF = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const fee = await prisma.fee.findUnique({
      where: { id },
      include: {
        member: {
          include: { user: { select: { username: true, email: true, phone: true } } },
        },
        gym: true,
      },
    });
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const isGymOwner = fee.gym.ownerId === req.user?.userId;
    const isSelf = fee.member.userId === req.user?.userId;
    if (!isSuperAdmin && !isGymOwner && !isSelf) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    sendPdf(res, `receipt-${fee.id.slice(0, 8)}.pdf`, (doc) =>
      buildFeeReceipt(doc, {
        feeId: fee.id,
        amount: fee.amount.toNumber(),
        paymentDate: fee.paymentDate,
        dueDate: fee.dueDate,
        status: fee.status,
        paymentMethod: fee.paymentMethod,
        transactionId: fee.transactionId,
        notes: fee.notes,
        gymName: fee.gym.name,
        gymAddress: fee.gym.address,
        gymGst: fee.gym.gstNumber,
        memberName: fee.member.user.username,
        memberEmail: fee.member.user.email,
        memberPhone: fee.member.user.phone,
      })
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};
