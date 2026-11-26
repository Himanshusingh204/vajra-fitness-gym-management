import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { seedAdmin, seedMember, seedTrainer, seedPlan, login, uniq, PASSWORD } from './helpers';

const agent = request(app);
const DAY = 24 * 60 * 60 * 1000;
const inAWeek = new Date(Date.now() + 7 * DAY).toISOString();

// Everything gym B owns that a route can take an id for.
const seedGymB = async () => {
  const { gym } = await seedAdmin();
  const gymId = gym.id;
  const member = await seedMember(gymId);
  const memberId = member.details.id;
  const trainer = await seedTrainer(gymId);
  const applicant = await seedTrainer(gymId);
  await prisma.trainerDetails.update({ where: { id: applicant.details.id }, data: { status: 'PENDING' } });
  const plan = await seedPlan(gymId);
  const membership = await prisma.membership.create({
    data: { memberId, gymId, planId: plan.id, status: 'ACTIVE', startDate: new Date(), endDate: new Date(Date.now() + 30 * DAY), originalAmount: 1500, finalAmount: 1500 },
  });
  const fee = await prisma.fee.create({ data: { memberId, gymId, amount: 1500, dueDate: new Date() } });
  const branch = await prisma.branch.create({ data: { gymId, name: 'North', address: '3 Lane', city: 'Pune', state: 'MH' } });
  const gymClass = await prisma.gymClass.create({ data: { gymId, name: 'Spin', capacity: 5 } });
  const classBooking = await prisma.classBooking.create({ data: { classId: gymClass.id, memberId } });
  const equipment = await prisma.equipment.create({ data: { gymId, name: 'Rower' } });
  const expense = await prisma.expense.create({ data: { gymId, category: 'RENT', description: 'Rent', amount: 100 } });
  const product = await prisma.product.create({ data: { gymId, name: 'Shaker', sellingPrice: 300, stock: 5 } });
  const notice = await prisma.notice.create({ data: { gymId, title: 'Closed', content: 'Closed Monday' } });
  const enquiry = await prisma.enquiry.create({ data: { gymId, name: 'Walk In', phone: '9876543210' } });
  const payslip = await prisma.payslip.create({ data: { gymId, userId: trainer.user.id, month: 1, year: 2026, basicSalary: 1000, netPay: 1000 } });
  const referral = await prisma.referral.create({ data: { gymId, referrerUserId: member.user.id, referralCode: 'VFB' } });
  const slip = await prisma.workoutSlip.create({ data: { gymId, memberId, exercises: 'Squats' } });
  const booking = await prisma.booking.create({ data: { gymId, userId: member.user.id, trainerId: trainer.user.id, date: '2030-01-01', time: '10:00' } });
  return { gymId, memberId, member, trainer, applicant, plan, membership, fee, branch, gymClass, classBooking, equipment, expense, product, notice, enquiry, payslip, referral, slip, booking };
};

describe('Cross-gym access', () => {
  it('the owner of gym A gets 403/404 on every gym-scoped route with gym B ids', async () => {
    const { user: ownerA, gym: gymA } = await seedAdmin();
    const ownMember = await seedMember(gymA.id);
    const b = await seedGymB();
    const token = (await login(ownerA.email, PASSWORD)).body.token as string;

    // The last flag marks a call on gym A's own URL with a gym B id in the body,
    // where a 400 ("does not belong to this gym") is also a refusal.
    const routes: Array<[string, string, Record<string, any>?, boolean?]> = [
      ['get', `/api/members/gym/${b.gymId}`],
      ['post', `/api/members/gym/${b.gymId}`, { username: 'Cross Member', email: uniq('x') }],
      ['post', `/api/members/gym/${b.gymId}/import`, { csv: `username,email\nCross,${uniq('x')}` }],
      ['post', `/api/members/${b.memberId}/activation-link`, {}],
      ['get', `/api/members/${b.memberId}`],
      ['put', `/api/members/${b.memberId}`, { status: 'SUSPENDED' }],
      ['delete', `/api/members/${b.memberId}`],
      ['get', `/api/plans/admin/gym/${b.gymId}`],
      ['post', '/api/plans', { name: 'Cross', duration: 30, price: 100, gymId: b.gymId }],
      ['put', `/api/plans/${b.plan.id}`, { name: 'Cross', duration: 30, price: 100 }],
      ['delete', `/api/plans/${b.plan.id}`],
      ['get', `/api/staff/gym/${b.gymId}`],
      ['post', `/api/staff/gym/${b.gymId}`, { username: 'Cross Staff', email: uniq('x'), roleType: 'STAFF', roleSpecifics: 'Desk' }],
      ['get', `/api/staff/gym/${b.gymId}/trainer-applications`],
      ['put', `/api/staff/trainer-applications/${b.applicant.details.id}/approve`, {}],
      ['put', `/api/staff/trainer-applications/${b.applicant.details.id}/reject`, {}],
      ['delete', `/api/staff/${b.trainer.details.id}`],
      ['get', `/api/fees/gym/${b.gymId}`],
      ['post', `/api/fees/gym/${b.gymId}`, { memberId: b.memberId, amount: 100, dueDate: inAWeek }],
      ['post', `/api/fees/gym/${gymA.id}`, { memberId: b.memberId, amount: 100, dueDate: inAWeek }, true],
      ['get', `/api/fees/member/${b.memberId}`],
      ['get', `/api/fees/${b.fee.id}/receipt`],
      ['put', `/api/fees/${b.fee.id}`, { status: 'PAID' }],
      ['delete', `/api/fees/${b.fee.id}`],
      ['get', `/api/attendance/gym/${b.gymId}`],
      ['post', `/api/attendance/gym/${b.gymId}`, { memberId: b.memberId }],
      ['post', `/api/attendance/gym/${gymA.id}`, { memberId: b.memberId }, true],
      ['get', `/api/workouts/member/${b.memberId}`],
      ['post', `/api/workouts/member/${b.memberId}`, { exercises: 'Lunges' }],
      ['get', `/api/workouts/gym/${b.gymId}`],
      ['get', `/api/workouts/${b.slip.id}/pdf`],
      ['get', `/api/enquiries/gym/${b.gymId}`],
      ['put', `/api/enquiries/${b.enquiry.id}`, { status: 'CLOSED' }],
      ['get', `/api/gym/${b.gymId}/stats`],
      ['get', `/api/bookings/gym/${b.gymId}`],
      ['patch', `/api/bookings/${b.booking.id}`, { status: 'CANCELLED' }],
      ['get', `/api/progress/member/${b.memberId}`],
      ['get', `/api/memberships/gym/${b.gymId}`],
      ['post', `/api/memberships/gym/${b.gymId}`, { memberId: b.memberId, planId: b.plan.id }],
      ['post', `/api/memberships/gym/${gymA.id}`, { memberId: b.memberId }],
      ['post', `/api/memberships/gym/${b.gymId}/renew`, { membershipId: b.membership.id }],
      ['post', `/api/memberships/gym/${gymA.id}/renew`, { membershipId: b.membership.id }],
      ['get', `/api/memberships/${b.membership.id}`],
      ['get', `/api/reports/gym/${b.gymId}/stats`],
      ['get', `/api/reports/gym/${b.gymId}/analytics`],
      ['get', `/api/reports/gym/${b.gymId}/revenue`],
      ['get', `/api/reports/gym/${b.gymId}/trainers`],
      ['get', `/api/notices/gym/${b.gymId}`],
      ['post', `/api/notices/gym/${b.gymId}`, { title: 'Cross', content: 'Cross gym' }],
      ['put', `/api/notices/${b.notice.id}`, { title: 'Cross' }],
      ['delete', `/api/notices/${b.notice.id}`],
      ['get', `/api/expenses/gym/${b.gymId}/summary`],
      ['get', `/api/expenses/gym/${b.gymId}`],
      ['post', `/api/expenses/gym/${b.gymId}`, { category: 'RENT', description: 'Cross', amount: 10 }],
      ['delete', `/api/expenses/${b.expense.id}`],
      ['get', `/api/inventory/gym/${b.gymId}/products`],
      ['post', `/api/inventory/gym/${b.gymId}/products`, { name: 'Cross' }],
      ['put', `/api/inventory/products/${b.product.id}`, { stock: 0 }],
      ['delete', `/api/inventory/products/${b.product.id}`],
      ['get', `/api/inventory/gym/${b.gymId}/categories`],
      ['post', `/api/inventory/gym/${b.gymId}/categories`, { name: 'Cross' }],
      ['get', `/api/inventory/gym/${b.gymId}/sales`],
      ['post', `/api/inventory/gym/${b.gymId}/sales`, { items: [{ productId: b.product.id, quantity: 1 }] }],
      ['post', `/api/inventory/gym/${gymA.id}/sales`, { items: [{ productId: b.product.id, quantity: 1 }] }, true],
      ['get', `/api/equipment/gym/${b.gymId}`],
      ['post', `/api/equipment/gym/${b.gymId}`, { name: 'Cross' }],
      ['put', `/api/equipment/${b.equipment.id}`, { name: 'Cross' }],
      ['post', `/api/equipment/${b.equipment.id}/maintenance`, { type: 'INSPECTION', description: 'Cross' }],
      ['delete', `/api/equipment/${b.equipment.id}`],
      ['post', `/api/classes/gym/${b.gymId}`, { name: 'Cross' }],
      ['put', `/api/classes/${b.gymClass.id}`, { name: 'Cross' }],
      ['delete', `/api/classes/${b.gymClass.id}`],
      ['get', `/api/classes/${b.gymClass.id}/bookings`],
      ['delete', `/api/classes/bookings/${b.classBooking.id}`],
      ['get', `/api/payslips/gym/${b.gymId}`],
      ['get', `/api/payslips/gym/${b.gymId}/summary`],
      ['post', `/api/payslips/gym/${b.gymId}`, { userId: b.trainer.user.id, month: 2, year: 2026, basicSalary: 10 }],
      ['post', `/api/payslips/gym/${gymA.id}`, { userId: b.trainer.user.id, month: 2, year: 2026, basicSalary: 10 }, true],
      ['put', `/api/payslips/${b.payslip.id}`, { status: 'PAID' }],
      ['delete', `/api/payslips/${b.payslip.id}`],
      ['get', `/api/referrals/gym/${b.gymId}`],
      ['get', `/api/referrals/gym/${b.gymId}/stats`],
      ['post', `/api/referrals/gym/${b.gymId}`, { userId: b.member.user.id, referredUserId: ownMember.user.id, rewardType: 'CREDIT', rewardValue: 1 }],
      ['put', `/api/referrals/${b.referral.id}`, { status: 'REWARDED' }],
      ['get', `/api/branches/gym/${b.gymId}`],
      ['post', `/api/branches/gym/${b.gymId}`, { name: 'Cross', address: '1 Road', city: 'Pune', state: 'MH' }],
      ['put', `/api/branches/${b.branch.id}`, { name: 'Cross' }],
      ['delete', `/api/branches/${b.branch.id}`],
    ];

    const leaks: string[] = [];
    for (const [method, path, body, ownUrl] of routes) {
      const req = (agent as any)[method](path).set('Authorization', `Bearer ${token}`);
      const res = await (body ? req.send(body) : req);
      if (![403, 404, ...(ownUrl ? [400] : [])].includes(res.status)) leaks.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
    }
    expect(leaks).toEqual([]);

    // Nothing of gym B's changed underneath the refusals.
    expect(await prisma.memberDetails.findUnique({ where: { id: b.memberId } })).toMatchObject({ status: 'ACTIVE' });
    expect(await prisma.fee.count({ where: { gymId: b.gymId } })).toBe(1);
    expect(await prisma.product.findUnique({ where: { id: b.product.id } })).toMatchObject({ stock: 5 });
    expect(await prisma.attendance.count()).toBe(0);
    expect(await prisma.payslip.count()).toBe(1);
  });
});
