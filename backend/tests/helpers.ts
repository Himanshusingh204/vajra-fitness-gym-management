import request from 'supertest';
import argon2 from 'argon2';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

const agent = request(app);

let seq = 0;
export const uniq = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}@test.local`;

export const PASSWORD = 'Str0ng!Passw0rd';

// ---------- HTTP helpers ----------

export const registerVendor = (overrides: Record<string, any> = {}) =>
  agent.post('/api/auth/register/vendor').send({
    username: 'Test Vendor',
    email: uniq('vendor'),
    password: PASSWORD,
    gymName: 'Test Gym',
    address: '1 Main Rd',
    city: 'Pune',
    state: 'MH',
    ...overrides,
  });

export const registerMember = (overrides: Record<string, any> = {}) =>
  agent.post('/api/auth/register/member').send({
    username: 'Test Member',
    email: uniq('member'),
    password: PASSWORD,
    gymId: overrides.gymId,
    ...overrides,
  });

export const login = (email: string, password = PASSWORD) =>
  agent.post('/api/auth/login').send({ email, password });

export const authGet = (token: string, path: string) =>
  agent.get(path).set('Authorization', `Bearer ${token}`);

export const authPost = (token: string, path: string, body: Record<string, any>) =>
  agent.post(path).set('Authorization', `Bearer ${token}`).send(body);

export const authPut = (token: string, path: string, body: Record<string, any>) =>
  agent.put(path).set('Authorization', `Bearer ${token}`).send(body);

export const authDelete = (token: string, path: string) =>
  agent.delete(path).set('Authorization', `Bearer ${token}`);

// ---------- Direct seeding (fast, deterministic) ----------

export const seedSuperAdmin = async (email?: string) => {
  const user = await prisma.user.create({
    data: {
      username: 'Super Admin',
      email: email ?? uniq('super'),
      password: await argon2.hash(PASSWORD),
      role: 'SUPER_ADMIN',
    },
  });
  return user;
};

export const seedAdmin = async (opts: { approved?: boolean } = {}) => {
  const user = await prisma.user.create({
    data: {
      username: 'Gym Owner',
      email: uniq('admin'),
      password: await argon2.hash(PASSWORD),
      role: 'GYM_ADMIN',
      phone: '9999999999',
    },
  });
  const gym = await prisma.gym.create({
    data: {
      name: 'Peak Club',
      ownerId: user.id,
      address: '2 Test Ave',
      city: 'Mumbai',
      state: 'MH',
      isApproved: opts.approved ?? true,
    },
  });
  return { user, gym, password: PASSWORD };
};

export const seedMember = async (gymId: string, opts: { status?: string } = {}) => {
  const user = await prisma.user.create({
    data: {
      username: 'Gym Member',
      email: uniq('member'),
      password: await argon2.hash(PASSWORD),
      role: 'MEMBER',
    },
  });
  const details = await prisma.memberDetails.create({
    data: { gymId, userId: user.id, status: opts.status ?? 'ACTIVE' },
  });
  return { user, details, password: PASSWORD };
};

export const seedTrainer = async (gymId: string) => {
  const user = await prisma.user.create({
    data: {
      username: 'Coach',
      email: uniq('trainer'),
      password: await argon2.hash(PASSWORD),
      role: 'TRAINER',
    },
  });
  const details = await prisma.trainerDetails.create({
    data: { gymId, userId: user.id, specialization: 'Strength' },
  });
  return { user, details, password: PASSWORD };
};

export const seedPlan = async (gymId: string, opts: { name?: string; price?: number; duration?: number } = {}) =>
  prisma.membershipPlan.create({
    data: {
      gymId,
      name: opts.name ?? 'Monthly',
      price: opts.price ?? 1500,
      duration: opts.duration ?? 30,
      isActive: true,
    },
  });

export const seedSubscription = async (gymId: string, maxMembers: number, maxTrainers: number, maxStaff: number) => {
  const code = `t${Date.now().toString(36)}${(seq++).toString(36)}`;
  const plan = await prisma.saaSPlan.create({
    data: { name: `Plan ${code}`, code, monthlyPrice: 5000, maxMembers, maxTrainers, maxStaff },
  });
  return prisma.gymSubscription.create({
    data: {
      gymId,
      planId: plan.id,
      status: 'ACTIVE',
      amount: 5000,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
};

export const authToken = async (user: { id: string; role: string; tokenVersion?: number }) => {
  const { default: jwt } = await import('jsonwebtoken');
  return jwt.sign(
    { userId: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' },
  );
};
