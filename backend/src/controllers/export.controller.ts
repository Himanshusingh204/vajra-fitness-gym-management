import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { canAccessGym } from '../utils/tenant';
import { logAudit } from '../utils/audit';

const MAX_ROWS = 50_000;

type Cell = string | number | boolean | Date | null | undefined;

// A leading = + - @ (or tab/CR) gets a ' in front so spreadsheets read the cell
// as text instead of a formula.
const csvCell = (value: Cell) => {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const sendCsv = async (
  req: AuthRequest,
  res: Response,
  name: string,
  header: string[],
  rows: Cell[][],
  audit: { entity: string; entityId?: string } | null,
) => {
  if (audit) {
    await logAudit({
      action: 'EXPORT_CSV',
      entity: audit.entity,
      entityId: audit.entityId ?? null,
      details: `${name}: ${rows.length} rows`,
      userId: req.user?.userId ?? null,
      ipAddress: req.ip ?? null,
    });
  }
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    'Cache-Control': 'no-store',
  });
  // The BOM makes Excel read the file as UTF-8.
  res.send(`﻿${lines.join('\r\n')}\r\n`);
};

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

// ?from=&to= as a date range; null when either is not a date.
const dateRange = (req: AuthRequest) => {
  const from = str(req.query.from);
  const to = str(req.query.to);
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  const bad = [range.gte, range.lte].some((d) => d && Number.isNaN(d.getTime()));
  return bad ? null : range;
};

// Owner exports share the gym check; null means the reply is already sent.
const gymExport = async (req: AuthRequest, res: Response) => {
  const gymId = req.params.gymId as string;
  if (!(await prisma.gym.count({ where: { id: gymId } }))) {
    res.status(404).json({ error: 'Gym not found' });
    return null;
  }
  if (!(await canAccessGym(req.user, gymId))) {
    res.status(403).json({ error: 'Unauthorized' });
    return null;
  }
  const range = dateRange(req);
  if (!range) {
    res.status(400).json({ error: 'from and to must be dates' });
    return null;
  }
  return { gymId, range, hasRange: Object.keys(range).length > 0 };
};

export const exportMembers = async (req: AuthRequest, res: Response) => {
  const ctx = await gymExport(req, res);
  if (!ctx) return;
  const status = str(req.query.status);
  const members = await prisma.memberDetails.findMany({
    where: { gymId: ctx.gymId, ...(status && { status }) },
    include: { user: { select: { username: true, email: true, phone: true } }, membershipPlan: { select: { name: true } } },
    orderBy: { joiningDate: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'members', ['Name', 'Email', 'Phone', 'Status', 'Plan', 'Joined', 'Gender', 'Date of birth', 'Address', 'Emergency contact'],
    members.map((m) => [m.user.username, m.user.email, m.user.phone, m.status, m.membershipPlan?.name, m.joiningDate, m.gender, m.dateOfBirth, m.address, m.emergencyContact]),
    { entity: 'Member', entityId: ctx.gymId });
};

export const exportFees = async (req: AuthRequest, res: Response) => {
  const ctx = await gymExport(req, res);
  if (!ctx) return;
  const status = str(req.query.status);
  const fees = await prisma.fee.findMany({
    where: { gymId: ctx.gymId, ...(status && { status }), ...(ctx.hasRange && { paymentDate: ctx.range }) },
    include: { member: { include: { user: { select: { username: true, email: true } } } } },
    orderBy: { paymentDate: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'payments', ['Member', 'Email', 'Amount', 'Discount', 'Tax', 'Status', 'Method', 'Transaction', 'Paid on', 'Due date', 'Notes'],
    fees.map((f) => [f.member.user.username, f.member.user.email, f.amount.toString(), f.discount.toString(), f.tax.toString(), f.status, f.paymentMethod, f.transactionId, f.paymentDate, f.dueDate, f.notes]),
    { entity: 'Fee', entityId: ctx.gymId });
};

export const exportAttendance = async (req: AuthRequest, res: Response) => {
  const ctx = await gymExport(req, res);
  if (!ctx) return;
  const rows = await prisma.attendance.findMany({
    where: { gymId: ctx.gymId, ...(ctx.hasRange && { checkIn: ctx.range }) },
    include: {
      member: { include: { user: { select: { username: true } } } },
      staff: { include: { user: { select: { username: true } } } },
    },
    orderBy: { checkIn: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'attendance', ['Name', 'Type', 'Check in', 'Check out', 'Status', 'Source'],
    rows.map((a) => [a.member?.user.username ?? a.staff?.user.username, a.member ? 'Member' : 'Staff', a.checkIn, a.checkOut, a.status, a.source]),
    { entity: 'Attendance', entityId: ctx.gymId });
};

export const exportExpenses = async (req: AuthRequest, res: Response) => {
  const ctx = await gymExport(req, res);
  if (!ctx) return;
  const category = str(req.query.category);
  const expenses = await prisma.expense.findMany({
    where: { gymId: ctx.gymId, ...(category && { category }), ...(ctx.hasRange && { date: ctx.range }) },
    orderBy: { date: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'expenses', ['Date', 'Category', 'Description', 'Amount', 'Recurring', 'Notes'],
    expenses.map((e) => [e.date, e.category, e.description, e.amount.toString(), e.isRecurring, e.notes]),
    null);
};

export const exportBookings = async (req: AuthRequest, res: Response) => {
  const ctx = await gymExport(req, res);
  if (!ctx) return;
  const status = str(req.query.status);
  const bookings = await prisma.booking.findMany({
    where: { gymId: ctx.gymId, ...(status && { status }) },
    include: { user: { select: { username: true, email: true } }, trainer: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'bookings', ['Member', 'Email', 'Trainer', 'Date', 'Time', 'Status', 'Notes'],
    bookings.map((b) => [b.user.username, b.user.email, b.trainer.username, b.date, b.time, b.status, b.notes]),
    { entity: 'Booking', entityId: ctx.gymId });
};

export const exportUsers = async (req: AuthRequest, res: Response) => {
  const role = str(req.query.role);
  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    select: { username: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'users', ['Name', 'Email', 'Phone', 'Role', 'Active', 'Joined'],
    users.map((u) => [u.username, u.email, u.phone, u.role, u.isActive, u.createdAt]),
    { entity: 'User' });
};

export const exportGyms = async (req: AuthRequest, res: Response) => {
  const status = str(req.query.status);
  const gyms = await prisma.gym.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
  });
  await sendCsv(req, res, 'gyms', ['Name', 'City', 'State', 'Status', 'Phone', 'Email', 'GST number', 'Created'],
    gyms.map((g) => [g.name, g.city, g.state, g.status, g.phone, g.email, g.gstNumber, g.createdAt]),
    { entity: 'Gym' });
};
