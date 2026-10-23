import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import {
  seedAdmin,
  seedMember,
  seedTrainer,
  seedPlan,
  authToken,
  registerVendor,
  registerMember,
  uniq,
} from './helpers';

const agent = request(app);
const DAY = 24 * 60 * 60 * 1000;
const SECRET = process.env.JWT_SECRET!;
const MARKER = 'BRAVOSECRET';

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JWT handling', () => {
  const protectedPaths = ['/api/auth/me', '/api/members/my-profile'];

  const expectRejected = async (authorization: string | null) => {
    for (const path of protectedPaths) {
      const req = agent.get(path);
      if (authorization !== null) req.set('Authorization', authorization);
      const res = await req;
      expect(res.status, `${path} with ${authorization}`).toBe(401);
    }
  };

  it('rejects a request with no token', async () => {
    await expectRejected(null);
  });

  it('rejects malformed tokens', async () => {
    await expectRejected('Bearer not-a-token');
    await expectRejected('Bearer a.b.c');
    await expectRejected('Bearer ');
  });

  it('rejects an alg:none token', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ userId: user.id, role: 'SUPER_ADMIN', tokenVersion: 0 })}.`;
    await expectRejected(`Bearer ${token}`);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = jwt.sign({ userId: user.id, role: 'MEMBER', tokenVersion: 0 }, 'x'.repeat(48), { expiresIn: '15m' });
    await expectRejected(`Bearer ${token}`);
  });

  it('rejects a token signed with another HMAC algorithm', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = jwt.sign({ userId: user.id, role: 'MEMBER', tokenVersion: 0 }, SECRET, { algorithm: 'HS512', expiresIn: '15m' });
    await expectRejected(`Bearer ${token}`);
  });

  it('rejects an expired token', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = jwt.sign(
      { userId: user.id, role: 'MEMBER', tokenVersion: 0, iat: Math.floor(Date.now() / 1000) - 3600, exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET,
    );
    await expectRejected(`Bearer ${token}`);
  });

  it('rejects a token with a stale tokenVersion', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = await authToken(user);
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    await expectRejected(`Bearer ${token}`);
  });

  it('does not let a forged role claim raise privileges', async () => {
    const { gym } = await seedAdmin();
    const { user } = await seedMember(gym.id);
    const token = jwt.sign({ userId: user.id, role: 'SUPER_ADMIN', tokenVersion: 0 }, SECRET, { expiresIn: '15m' });
    const res = await agent.get('/api/admin/gyms').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ---------- Cross-tenant sweep ----------

const future = () => new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10);

const seedTenant = async (label: string) => {
  const { user: admin, gym } = await seedAdmin();
  await prisma.gym.update({ where: { id: gym.id }, data: { name: `${label} Gym ${MARKER}` } });
  const member = await seedMember(gym.id);
  const trainer = await seedTrainer(gym.id);
  const staffUser = await prisma.user.create({
    data: { username: `${label} Desk`, email: uniq('staff'), password: 'x', role: 'STAFF' },
  });
  const staff = await prisma.staffDetails.create({ data: { gymId: gym.id, userId: staffUser.id, role: 'Reception' } });

  const plan = await seedPlan(gym.id, { name: `${label} Plan ${MARKER}` });
  const membership = await prisma.membership.create({
    data: {
      memberId: member.details.id,
      gymId: gym.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * DAY),
      originalAmount: 1500,
      finalAmount: 1500,
      status: 'ACTIVE',
    },
  });
  const fee = await prisma.fee.create({
    data: { memberId: member.details.id, gymId: gym.id, membershipId: membership.id, amount: 1500, dueDate: new Date(), status: 'PENDING', notes: MARKER },
  });
  const attendance = await prisma.attendance.create({ data: { gymId: gym.id, memberId: member.details.id } });
  const slip = await prisma.workoutSlip.create({
    data: { gymId: gym.id, memberId: member.details.id, trainerId: trainer.details.id, title: MARKER, exercises: `Squat ${MARKER}` },
  });
  const enquiry = await prisma.enquiry.create({ data: { gymId: gym.id, name: `Lead ${MARKER}`, phone: '9876543210' } });
  const booking = await prisma.booking.create({
    data: { gymId: gym.id, userId: member.user.id, trainerId: trainer.user.id, date: future(), time: '10:00', notes: MARKER },
  });
  const progress = await prisma.progressLog.create({ data: { userId: member.user.id, weight: 71.3, notes: MARKER } });
  const nutrition = await prisma.nutritionPlan.create({ data: { userId: member.user.id, title: `Diet ${MARKER}` } });
  const notification = await prisma.notification.create({ data: { userId: admin.id, title: MARKER, message: MARKER } });
  const memberNotification = await prisma.notification.create({ data: { userId: member.user.id, title: MARKER, message: MARKER } });
  const notice = await prisma.notice.create({ data: { gymId: gym.id, title: `Notice ${MARKER}`, content: MARKER } });
  const expense = await prisma.expense.create({ data: { gymId: gym.id, category: 'MISC', description: MARKER, amount: 999 } });
  const category = await prisma.productCategory.create({ data: { gymId: gym.id, name: `Cat ${MARKER}` } });
  const product = await prisma.product.create({ data: { gymId: gym.id, name: `Whey ${MARKER}`, stock: 10, sellingPrice: 100, categoryId: category.id } });
  const equipment = await prisma.equipment.create({ data: { gymId: gym.id, name: `Rack ${MARKER}` } });
  const gymClass = await prisma.gymClass.create({ data: { gymId: gym.id, name: `Yoga ${MARKER}`, trainerId: trainer.details.id } });
  const classBooking = await prisma.classBooking.create({ data: { classId: gymClass.id, memberId: member.details.id } });
  const payslip = await prisma.payslip.create({
    data: { gymId: gym.id, userId: trainer.user.id, month: 1, year: 2026, basicSalary: 20000, netPay: 20000, notes: MARKER },
  });
  const referral = await prisma.referral.create({ data: { gymId: gym.id, referrerUserId: member.user.id, referralCode: MARKER } });
  const branch = await prisma.branch.create({ data: { gymId: gym.id, name: `Branch ${MARKER}`, address: '1 Road', city: 'Pune', state: 'MH' } });

  return {
    gym, admin, member, trainer, staffUser, staff, plan, membership, fee, attendance, slip, enquiry, booking, progress,
    nutrition, notification, memberNotification, notice, expense, category, product, equipment, gymClass, classBooking,
    payslip, referral, branch,
  };
};

type Tenant = Awaited<ReturnType<typeof seedTenant>>;

const sorted = { orderBy: { id: 'asc' as const } };

// Everything gym B owns, plus any row anywhere that points at one of its records.
const snapshot = async (b: Tenant) => {
  const gymId = b.gym.id;
  const userIds = [b.admin.id, b.member.user.id, b.trainer.user.id, b.staffUser.id];
  const memberIds = [b.member.details.id];
  const data = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, ...sorted }),
    prisma.memberDetails.findMany({ where: { OR: [{ gymId }, { id: { in: memberIds } }] }, ...sorted }),
    prisma.trainerDetails.findMany({ where: { gymId }, ...sorted }),
    prisma.staffDetails.findMany({ where: { gymId }, ...sorted }),
    prisma.membershipPlan.findMany({ where: { gymId }, ...sorted }),
    prisma.membership.findMany({ where: { OR: [{ gymId }, { memberId: { in: memberIds } }, { planId: b.plan.id }] }, ...sorted }),
    prisma.fee.findMany({ where: { OR: [{ gymId }, { memberId: { in: memberIds } }] }, ...sorted }),
    prisma.attendance.findMany({ where: { OR: [{ gymId }, { memberId: { in: memberIds } }, { staffId: b.staff.id }] }, ...sorted }),
    prisma.workoutSlip.findMany({ where: { OR: [{ gymId }, { memberId: { in: memberIds } }, { trainerId: b.trainer.details.id }] }, ...sorted }),
    prisma.enquiry.findMany({ where: { gymId }, ...sorted }),
    prisma.booking.findMany({ where: { OR: [{ gymId }, { userId: { in: userIds } }, { trainerId: { in: userIds } }] }, ...sorted }),
    prisma.progressLog.findMany({ where: { userId: { in: userIds } }, ...sorted }),
    prisma.nutritionPlan.findMany({ where: { userId: { in: userIds } }, ...sorted }),
    prisma.notification.findMany({ where: { userId: { in: userIds } }, ...sorted }),
    prisma.notice.findMany({ where: { gymId }, ...sorted }),
    prisma.expense.findMany({ where: { gymId }, ...sorted }),
    prisma.productCategory.findMany({ where: { gymId }, ...sorted }),
    prisma.product.findMany({ where: { OR: [{ gymId }, { categoryId: b.category.id }] }, ...sorted }),
    prisma.sale.findMany({ where: { gymId }, ...sorted }),
    prisma.equipment.findMany({ where: { gymId }, ...sorted }),
    prisma.equipmentMaintenance.findMany({ where: { equipmentId: b.equipment.id }, ...sorted }),
    prisma.gymClass.findMany({ where: { OR: [{ gymId }, { trainerId: b.trainer.details.id }, { branchId: b.branch.id }] }, ...sorted }),
    prisma.classBooking.findMany({ where: { OR: [{ classId: b.gymClass.id }, { memberId: { in: memberIds } }] }, ...sorted }),
    prisma.payslip.findMany({ where: { OR: [{ gymId }, { userId: { in: userIds } }] }, ...sorted }),
    prisma.referral.findMany({ where: { OR: [{ gymId }, { referrerUserId: { in: userIds } }, { referredUserId: { in: userIds } }] }, ...sorted }),
    prisma.branch.findMany({ where: { gymId }, ...sorted }),
    prisma.memberDetails.count({ where: { branchId: b.branch.id } }),
  ]);
  return JSON.stringify(data);
};

interface Probe {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  body?: Record<string, unknown>;
}

// Built from every tenant router mounted in app.ts. Each probe either targets
// gym B directly or uses gym A's own path with a reference to a gym B record.
const probes = (a: Tenant, b: Tenant): Probe[] => {
  const B = b.gym.id;
  const A = a.gym.id;
  const mB = b.member.details.id;
  const email = () => uniq('intruder');
  return [
    // members
    { method: 'get', path: `/api/members/gym/${B}` },
    { method: 'post', path: `/api/members/gym/${B}`, body: { username: 'Intruder', email: email(), status: 'ACTIVE' } },
    { method: 'post', path: `/api/members/gym/${B}/import`, body: { csv: `name,email\nIntruder,${email()}` } },
    { method: 'post', path: `/api/members/${mB}/activation-link`, body: {} },
    { method: 'get', path: `/api/members/${mB}` },
    { method: 'put', path: `/api/members/${mB}`, body: { status: 'SUSPENDED' } },
    { method: 'delete', path: `/api/members/${mB}` },
    { method: 'post', path: `/api/members/gym/${A}`, body: { username: 'Cross Plan', email: email(), status: 'ACTIVE', planId: b.plan.id } },
    { method: 'post', path: `/api/members/gym/${A}`, body: { username: 'Cross Branch', email: email(), status: 'ACTIVE', branchId: b.branch.id } },
    { method: 'post', path: '/api/members/enroll', body: { gymId: B } },
    // membership plans
    { method: 'get', path: `/api/plans/admin/gym/${B}` },
    { method: 'post', path: '/api/plans', body: { name: 'Intruder plan', duration: 30, price: 100, gymId: B } },
    { method: 'put', path: `/api/plans/${b.plan.id}`, body: { name: 'Hijacked', duration: 30, price: 1 } },
    { method: 'delete', path: `/api/plans/${b.plan.id}` },
    // staff
    { method: 'get', path: `/api/staff/gym/${B}` },
    { method: 'post', path: `/api/staff/gym/${B}`, body: { username: 'Intruder', email: email(), roleType: 'STAFF', roleSpecifics: 'Desk' } },
    { method: 'delete', path: `/api/staff/${b.staff.id}` },
    { method: 'delete', path: `/api/staff/${b.trainer.details.id}` },
    // fees
    { method: 'get', path: `/api/fees/member/${mB}` },
    { method: 'get', path: `/api/fees/${b.fee.id}/receipt` },
    { method: 'get', path: `/api/fees/gym/${B}` },
    { method: 'post', path: `/api/fees/gym/${B}`, body: { memberId: mB, amount: 100, dueDate: future() } },
    { method: 'post', path: `/api/fees/gym/${A}`, body: { memberId: mB, amount: 100, dueDate: future() } },
    { method: 'put', path: `/api/fees/${b.fee.id}`, body: { status: 'PAID' } },
    { method: 'delete', path: `/api/fees/${b.fee.id}` },
    // attendance
    { method: 'get', path: `/api/attendance/gym/${B}` },
    { method: 'post', path: `/api/attendance/gym/${B}`, body: { memberId: mB } },
    { method: 'post', path: `/api/attendance/gym/${A}`, body: { memberId: mB } },
    { method: 'post', path: `/api/attendance/gym/${A}`, body: { staffId: b.staff.id } },
    // workouts
    { method: 'get', path: `/api/workouts/member/${mB}` },
    { method: 'post', path: `/api/workouts/member/${mB}`, body: { exercises: 'Intruder squat' } },
    { method: 'post', path: `/api/workouts/member/${a.member.details.id}`, body: { exercises: 'Cross trainer', trainerId: b.trainer.details.id } },
    { method: 'get', path: `/api/workouts/gym/${B}` },
    { method: 'get', path: `/api/workouts/${b.slip.id}/pdf` },
    // enquiries
    { method: 'get', path: `/api/enquiries/gym/${B}` },
    { method: 'put', path: `/api/enquiries/${b.enquiry.id}`, body: { status: 'CLOSED' } },
    // gym
    { method: 'get', path: `/api/gym/${B}/stats` },
    // bookings
    { method: 'get', path: `/api/bookings/gym/${B}` },
    { method: 'patch', path: `/api/bookings/${b.booking.id}`, body: { status: 'CANCELLED' } },
    { method: 'post', path: '/api/bookings', body: { trainerId: b.trainer.user.id, date: future(), time: '11:00' } },
    // progress
    { method: 'get', path: `/api/progress/member/${mB}` },
    // nutrition
    { method: 'put', path: `/api/nutrition/${b.nutrition.id}`, body: { title: 'Hijacked diet' } },
    { method: 'delete', path: `/api/nutrition/${b.nutrition.id}` },
    // memberships
    { method: 'get', path: `/api/memberships/gym/${B}` },
    { method: 'post', path: `/api/memberships/gym/${B}`, body: { memberId: mB } },
    { method: 'post', path: `/api/memberships/gym/${A}`, body: { memberId: mB } },
    { method: 'post', path: `/api/memberships/gym/${A}`, body: { memberId: a.member.details.id, planId: b.plan.id } },
    { method: 'post', path: `/api/memberships/gym/${B}/renew`, body: { membershipId: b.membership.id } },
    { method: 'post', path: `/api/memberships/gym/${A}/renew`, body: { membershipId: b.membership.id } },
    { method: 'get', path: `/api/memberships/${b.membership.id}` },
    // notifications
    { method: 'put', path: `/api/notifications/${b.notification.id}/read` },
    { method: 'delete', path: `/api/notifications/${b.notification.id}` },
    { method: 'put', path: `/api/notifications/${b.memberNotification.id}/read` },
    { method: 'delete', path: `/api/notifications/${b.memberNotification.id}` },
    // notices
    { method: 'get', path: `/api/notices/gym/${B}` },
    { method: 'post', path: `/api/notices/gym/${B}`, body: { title: 'Intruder', content: 'Intruder notice' } },
    { method: 'put', path: `/api/notices/${b.notice.id}`, body: { title: 'Hijacked' } },
    { method: 'delete', path: `/api/notices/${b.notice.id}` },
    // expenses
    { method: 'get', path: `/api/expenses/gym/${B}/summary` },
    { method: 'get', path: `/api/expenses/gym/${B}` },
    { method: 'post', path: `/api/expenses/gym/${B}`, body: { category: 'MISC', description: 'Intruder', amount: 10 } },
    { method: 'delete', path: `/api/expenses/${b.expense.id}` },
    // inventory
    { method: 'get', path: `/api/inventory/gym/${B}/products` },
    { method: 'post', path: `/api/inventory/gym/${B}/products`, body: { name: 'Intruder product' } },
    { method: 'post', path: `/api/inventory/gym/${A}/products`, body: { name: 'Cross category', categoryId: b.category.id } },
    { method: 'put', path: `/api/inventory/products/${b.product.id}`, body: { stock: 0 } },
    { method: 'delete', path: `/api/inventory/products/${b.product.id}` },
    { method: 'get', path: `/api/inventory/gym/${B}/categories` },
    { method: 'post', path: `/api/inventory/gym/${B}/categories`, body: { name: 'Intruder category' } },
    { method: 'get', path: `/api/inventory/gym/${B}/sales` },
    { method: 'post', path: `/api/inventory/gym/${B}/sales`, body: { items: [{ productId: b.product.id, quantity: 1 }] } },
    { method: 'post', path: `/api/inventory/gym/${A}/sales`, body: { items: [{ productId: b.product.id, quantity: 1 }] } },
    // equipment
    { method: 'get', path: `/api/equipment/gym/${B}` },
    { method: 'post', path: `/api/equipment/gym/${B}`, body: { name: 'Intruder rack' } },
    { method: 'put', path: `/api/equipment/${b.equipment.id}`, body: { name: 'Hijacked rack' } },
    { method: 'post', path: `/api/equipment/${b.equipment.id}/maintenance`, body: { type: 'INSPECTION', description: 'Intruder check' } },
    { method: 'delete', path: `/api/equipment/${b.equipment.id}` },
    // classes
    { method: 'post', path: `/api/classes/gym/${B}`, body: { name: 'Intruder class' } },
    { method: 'post', path: `/api/classes/gym/${A}`, body: { name: 'Cross trainer class', trainerId: b.trainer.details.id } },
    { method: 'post', path: `/api/classes/gym/${A}`, body: { name: 'Cross branch class', branchId: b.branch.id } },
    { method: 'put', path: `/api/classes/${b.gymClass.id}`, body: { name: 'Hijacked class' } },
    { method: 'delete', path: `/api/classes/${b.gymClass.id}` },
    { method: 'get', path: `/api/classes/${b.gymClass.id}/bookings` },
    { method: 'post', path: `/api/classes/${b.gymClass.id}/book` },
    { method: 'delete', path: `/api/classes/bookings/${b.classBooking.id}` },
    // payslips
    { method: 'get', path: `/api/payslips/gym/${B}` },
    { method: 'get', path: `/api/payslips/gym/${B}/summary` },
    { method: 'post', path: `/api/payslips/gym/${B}`, body: { userId: b.trainer.user.id, month: 2, year: 2026, basicSalary: 1 } },
    { method: 'post', path: `/api/payslips/gym/${A}`, body: { userId: b.trainer.user.id, month: 3, year: 2026, basicSalary: 1 } },
    { method: 'put', path: `/api/payslips/${b.payslip.id}`, body: { status: 'PAID' } },
    { method: 'delete', path: `/api/payslips/${b.payslip.id}` },
    // referrals
    { method: 'get', path: `/api/referrals/gym/${B}` },
    { method: 'get', path: `/api/referrals/gym/${B}/stats` },
    { method: 'post', path: `/api/referrals/gym/${B}`, body: { userId: b.member.user.id } },
    { method: 'post', path: `/api/referrals/gym/${A}`, body: { userId: b.member.user.id } },
    { method: 'put', path: `/api/referrals/${b.referral.id}`, body: { status: 'REWARDED' } },
    // branches
    { method: 'get', path: `/api/branches/gym/${B}` },
    { method: 'post', path: `/api/branches/gym/${B}`, body: { name: 'Intruder branch', address: '9 Road', city: 'Pune', state: 'MH' } },
    { method: 'put', path: `/api/branches/${b.branch.id}`, body: { name: 'Hijacked branch' } },
    { method: 'delete', path: `/api/branches/${b.branch.id}` },
    // reports
    { method: 'get', path: `/api/reports/gym/${B}/stats` },
    { method: 'get', path: `/api/reports/gym/${B}/analytics` },
    { method: 'get', path: `/api/reports/gym/${B}/revenue` },
    { method: 'get', path: `/api/reports/gym/${B}/trainers` },
  ];
};

// Ids and text that must never show up in a response to gym A.
const secretsOf = (b: Tenant) => [
  MARKER,
  b.member.user.email,
  b.trainer.user.email,
  b.admin.email,
  b.member.details.id,
  b.fee.id,
  b.slip.id,
  b.enquiry.id,
  b.booking.id,
  b.progress.id,
  b.nutrition.id,
  b.notification.id,
  b.notice.id,
  b.expense.id,
  b.product.id,
  b.equipment.id,
  b.gymClass.id,
  b.classBooking.id,
  b.payslip.id,
  b.referral.id,
  b.branch.id,
  b.membership.id,
];

const send = (probe: Probe, token: string) => {
  const req = agent[probe.method](probe.path).set('Authorization', `Bearer ${token}`);
  return probe.body ? req.send(probe.body) : req;
};

const sweep = async (role: string, token: string, a: Tenant, b: Tenant) => {
  const failures: string[] = [];
  const secrets = secretsOf(b);
  let before = await snapshot(b);

  for (const probe of probes(a, b)) {
    const res = await send(probe, token);
    const label = `${role} ${probe.method.toUpperCase()} ${probe.path.replace(b.gym.id, ':gymB').replace(a.gym.id, ':gymA')} -> ${res.status}`;
    const ok = res.status >= 200 && res.status < 300;

    if (ok) {
      const text = typeof res.text === 'string' ? res.text : '';
      const leaked = secrets.find((s) => text.includes(s));
      if (leaked) failures.push(`${label} leaked gym B data (${leaked === MARKER ? 'record text' : 'record id'})`);
      if (String(res.headers['content-type'] ?? '').includes('pdf')) failures.push(`${label} returned gym B's PDF`);
    }
    if (res.status >= 500) failures.push(`${label} server error`);

    if (probe.method !== 'get') {
      const after = await snapshot(b);
      if (after !== before) failures.push(`${label} changed gym B data`);
      before = after;
    }
  }
  return failures;
};

describe('Cross-tenant isolation (IDOR sweep)', () => {
  it('keeps every tenant router closed to another gym', async () => {
    const a = await seedTenant('Alpha');
    const b = await seedTenant('Bravo');
    // Gym A's own records get no marker so leaks of B are unambiguous.
    await prisma.gym.update({ where: { id: a.gym.id }, data: { name: 'Alpha Gym' } });

    const callers: Array<[string, { id: string; role: string }]> = [
      ['GYM_ADMIN', a.admin],
      ['MEMBER', a.member.user],
      ['TRAINER', a.trainer.user],
      ['STAFF', a.staffUser],
    ];

    const failures: string[] = [];
    for (const [role, user] of callers) {
      failures.push(...(await sweep(role, await authToken(user), a, b)));
    }

    expect(failures).toEqual([]);
  }, 600_000);
});

// ---------- Mass assignment ----------

describe('Mass assignment', () => {
  it('ignores privileged fields on vendor registration', async () => {
    const { user: someoneElse } = await seedAdmin();
    const res = await registerVendor({
      role: 'SUPER_ADMIN',
      isApproved: true,
      ownerId: someoneElse.id,
      tokenVersion: 7,
      isActive: true,
    });
    expect(res.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    expect(user.role).toBe('GYM_ADMIN');
    expect(user.tokenVersion).toBe(0);
    const gym = await prisma.gym.findFirstOrThrow({ where: { ownerId: user.id } });
    expect(gym.isApproved).toBe(false);
    expect(await prisma.gym.count({ where: { ownerId: someoneElse.id } })).toBe(1);
  });

  it('ignores privileged fields on member registration', async () => {
    const { gym } = await seedAdmin();
    const email = uniq('member');
    const res = await registerMember({ email, gymId: gym.id, role: 'SUPER_ADMIN', tokenVersion: 9, isApproved: true, ownerId: gym.ownerId });
    expect([200, 201]).toContain(res.status);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe('MEMBER');
    expect(user.tokenVersion).toBe(0);
    const details = await prisma.memberDetails.findFirstOrThrow({ where: { userId: user.id } });
    expect(details.status).toBe('PENDING');
  });

  it('ignores role, gymId and tokenVersion on member update', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { gym: otherGym } = await seedAdmin();
    const { user, details } = await seedMember(gym.id);
    const token = await authToken(admin);

    await agent
      .put(`/api/members/${details.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ACTIVE', role: 'GYM_ADMIN', gymId: otherGym.id, tokenVersion: 4, userId: admin.id });

    const after = await prisma.memberDetails.findUniqueOrThrow({ where: { id: details.id } });
    expect(after.gymId).toBe(gym.id);
    expect(after.userId).toBe(user.id);
    const userAfter = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(userAfter.role).toBe('MEMBER');
    expect(userAfter.tokenVersion).toBe(0);
  });

  it('ignores isApproved and ownerId on gym update', async () => {
    const { user: admin, gym } = await seedAdmin({ approved: false });
    const { user: other } = await seedAdmin();
    const token = await authToken(admin);

    await agent
      .put('/api/gym/my-branch')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Gym', isApproved: true, ownerId: other.id, id: other.id });

    const after = await prisma.gym.findUniqueOrThrow({ where: { id: gym.id } });
    expect(after.isApproved).toBe(false);
    expect(after.ownerId).toBe(admin.id);
  });

  it('ignores gymId on membership plan update', async () => {
    const { user: admin, gym } = await seedAdmin();
    const { gym: otherGym } = await seedAdmin();
    const plan = await seedPlan(gym.id);
    const token = await authToken(admin);

    await agent
      .put(`/api/plans/${plan.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Monthly', duration: 30, price: 1500, gymId: otherGym.id });

    const after = await prisma.membershipPlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(after.gymId).toBe(gym.id);
  });
});

// ---------- Transport and error hygiene ----------

describe('CORS', () => {
  it('rejects an unknown origin', async () => {
    const res = await agent.get('/api/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects an unknown origin on preflight', async () => {
    const res = await agent
      .options('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the configured frontend origin', async () => {
    const res = await agent.get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('Error responses', () => {
  const looksLikeStack = /\bat .+\(.+:\d+:\d+\)|node_modules|\.ts:\d+|PrismaClient|stack/i;

  it('do not include stack traces or internals', async () => {
    const { user: admin } = await seedAdmin();
    const token = await authToken(admin);
    const responses = await Promise.all([
      agent.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": broken'),
      agent.get('/api/does-not-exist'),
      agent.get('/api/members/not-a-uuid').set('Authorization', `Bearer ${token}`),
      agent.put('/api/plans/00000000-0000-4000-8000-000000000000').set('Authorization', `Bearer ${token}`).send({ name: 'Ghost', duration: 30, price: 1 }),
      agent.post('/api/fees/gym/not-a-uuid').set('Authorization', `Bearer ${token}`).send({}),
    ]);
    for (const res of responses) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.text).not.toMatch(looksLikeStack);
    }
  });
});

describe('Operational endpoints', () => {
  afterEach(() => {
    delete process.env.METRICS_TOKEN;
    delete process.env.CRON_SECRET;
  });

  it('/metrics requires METRICS_TOKEN when it is set', async () => {
    process.env.METRICS_TOKEN = 'metrics-token-for-tests';
    expect((await agent.get('/metrics')).status).toBe(401);
    expect((await agent.get('/metrics').set('Authorization', 'Bearer wrong')).status).toBe(401);
    const ok = await agent.get('/metrics').set('Authorization', 'Bearer metrics-token-for-tests');
    expect(ok.status).toBe(200);
  });

  it('/api/internal/cron is closed when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    expect((await agent.get('/api/internal/cron')).status).toBe(401);
    expect((await agent.post('/api/internal/cron').set('Authorization', 'Bearer ')).status).toBe(401);
    expect((await agent.post('/api/internal/cron').set('Authorization', 'Bearer undefined')).status).toBe(401);
  });

  it('/api/internal/cron needs the exact bearer secret', async () => {
    process.env.CRON_SECRET = 'cron-secret-for-tests-0123456789';
    expect((await agent.get('/api/internal/cron')).status).toBe(401);
    expect((await agent.get('/api/internal/cron').set('Authorization', 'Bearer cron-secret-for-tests')).status).toBe(401);
    expect((await agent.get('/api/internal/cron').set('Authorization', 'cron-secret-for-tests-0123456789')).status).toBe(401);

    const get = await agent.get('/api/internal/cron').set('Authorization', 'Bearer cron-secret-for-tests-0123456789');
    expect(get.status).toBe(200);
    expect(get.body.ok).toBe(true);
    const post = await agent.post('/api/internal/cron').set('Authorization', 'Bearer cron-secret-for-tests-0123456789');
    expect(post.status).toBe(200);
  });

  it('/api/internal/cron runs the subscription lifecycle', async () => {
    process.env.CRON_SECRET = 'cron-secret-for-tests-0123456789';
    const { gym } = await seedAdmin({ subscription: false });
    const plan = await prisma.saaSPlan.create({ data: { name: 'Cron plan', code: 'CRONPLAN', monthlyPrice: 1 } });
    const sub = await prisma.gymSubscription.create({
      data: {
        gymId: gym.id,
        planId: plan.id,
        status: 'ACTIVE',
        amount: 1,
        startDate: new Date(Date.now() - 40 * DAY),
        endDate: new Date(Date.now() - 10 * DAY),
      },
    });
    const res = await agent.post('/api/internal/cron').set('Authorization', 'Bearer cron-secret-for-tests-0123456789');
    expect(res.status).toBe(200);
    expect((await prisma.gymSubscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe('EXPIRED');
  });

  it('/api/health reports the real database status', async () => {
    const res = await agent.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.dependencies.database).toBe('up');
    expect(['up', 'down', 'memory']).toContain(res.body.dependencies.cache);
    expect(res.body.environment).toBeUndefined();
  });

  it('/api/ready still answers', async () => {
    const res = await agent.get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });
});
