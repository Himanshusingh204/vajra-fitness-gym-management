import { describe, it, expect } from 'vitest';
import { prisma } from '../src/utils/prisma';
import { findDuplicateGym } from '../src/utils/duplicateGym';
import { registerVendor, seedAdmin } from './helpers';

describe('Duplicate gym check', () => {
  it('matches name + city, phone and GSTIN loosely, and skips the gym itself', async () => {
    const { gym } = await seedAdmin();
    await prisma.gym.update({ where: { id: gym.id }, data: { phone: '+91 98765 43210', gstNumber: '27ABCDE1234F1Z5' } });

    expect((await findDuplicateGym({ name: '  peak CLUB ', city: 'mumbai' }))?.field).toBe('name');
    expect((await findDuplicateGym({ phone: '9876543210' }))?.field).toBe('phone');
    expect((await findDuplicateGym({ gstNumber: '27abcde1234f1z5' }))?.field).toBe('gstNumber');
    expect(await findDuplicateGym({ name: 'Peak Club', city: 'Pune', phone: '9123456789' })).toBeNull();
    expect(await findDuplicateGym({ name: 'Peak Club', city: 'Mumbai', phone: '9876543210' }, gym.id)).toBeNull();
  });

  it('rejects a vendor registering a gym that already exists', async () => {
    await seedAdmin();
    const res = await registerVendor({ gymName: 'Peak Club', city: 'Mumbai' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists in Mumbai/);
    expect((await registerVendor({ gymName: 'Peak Club', city: 'Pune' })).status).toBe(201);
  });
});
