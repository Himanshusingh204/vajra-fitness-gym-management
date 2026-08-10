import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Shared demo password for every seeded member/trainer/staff (seed only).
const DEMO_PASSWORD = 'Demo@1234';

// Deterministic RNG so reruns produce identical, realistic data.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Rohan', 'Karthik', 'Rahul', 'Nikhil',
  'Sneha', 'Priya', 'Ananya', 'Divya', 'Pooja', 'Ritika', 'Shreya', 'Meera', 'Kavya', 'Ishita',
  'Rajesh', 'Suresh', 'Amit', 'Vikram', 'Deepak', 'Manish', 'Sunil', 'Ravi', 'Sanjay', 'Ajay',
  'Neha', 'Kiran', 'Sonia', 'Radhika', 'Preeti', 'Nisha', 'Shalini', 'Anjali', 'Swati', 'Pallavi',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Iyer', 'Menon',
  'Joshi', 'Deshmukh', 'Kulkarni', 'Mehta', 'Shah', 'Das', 'Bose', 'Mukherjee', 'Banerjee',
  'Chopra', 'Kapoor', 'Malhotra', 'Saxena', 'Tiwari', 'Pandey', 'Mishra', 'Trivedi', 'Agarwal',
  'Bhatt', 'Pillai', 'Hegde', 'Shetty', 'Naik', 'Kamble', 'Pawar', 'Gawande', 'Bhosale', 'Rane',
];

const TRAINER_SPECIALIZATIONS = [
  'Strength & Conditioning',
  'Weight Loss',
  'CrossFit',
  'Yoga & Mobility',
  'Bodybuilding',
  'Functional Training',
  'Sports Performance',
  'Physio & Rehab',
];

const STAFF_ROLES = ['Manager', 'Receptionist', 'Accountant', 'Floor Trainer', 'Cleaner'];

const PLAN_CURRENCY_FACTOR = 1;

// Common exercise names grouped by muscle focus.
const EXERCISES = [
  'Squats', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-Ups',
  'Lat Pulldown', 'Dumbbell Curls', 'Tricep Pushdowns', 'Lunges', 'Leg Press', 'Leg Curl',
  'Leg Extension', 'Calf Raises', 'Planks', 'Crunches', 'Russian Twists', 'Back Extensions',
  'Lateral Raises', 'Face Pulls', 'Chest Fly', 'Shoulder Press', 'Romanian Deadlift',
  'Hip Thrust', 'Treadmill', 'Stationary Bike', 'Rowing Machine', 'Elliptical',
];

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickMany(rand: () => number, arr: string[], count: number): string[] {
  const copy = [...arr];
  const out: string[] = [];
  while (out.length < count && copy.length > 0) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]!);
  }
  return out;
}

function makeEmail(first: string, last: string, seq: number): string {
  return `${first.toLowerCase()}.${last.toLowerCase()}${seq}@demo.in`;
}

// Deterministic check-in times across the day (morning / evening rush).
function randomCheckIn(rand: () => number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  const hour = rand() < 0.5 ? 6 + Math.floor(rand() * 3) : 17 + Math.floor(rand() * 4);
  d.setHours(hour, Math.floor(rand() * 60));
  return d;
}

interface BookingKey {
  trainerId: string;
  date: string;
  time: string;
}

async function seedSaaS() {
  const plans = [
    {
      name: 'Starter',
      code: 'STARTER',
      description: 'For a single gym just getting started',
      monthlyPrice: 999,
      quarterlyPrice: 2499,
      halfYearlyPrice: 4799,
      yearlyPrice: 8999,
      currency: 'INR',
      maxGyms: 1,
      maxMembers: 100,
      maxTrainers: 5,
      maxStaff: 5,
      maxBranches: 1,
      advancedReports: false,
      features: JSON.stringify(['member-management', 'attendance', 'fee-collection', 'member-portal']),
    },
    {
      name: 'Professional',
      code: 'PROFESSIONAL',
      description: 'For growing gyms that need PT, bookings and reports',
      monthlyPrice: 2499,
      quarterlyPrice: 6249,
      halfYearlyPrice: 11999,
      yearlyPrice: 21999,
      currency: 'INR',
      maxGyms: 1,
      maxMembers: 500,
      maxTrainers: 20,
      maxStaff: 20,
      maxBranches: 3,
      advancedReports: true,
      features: JSON.stringify(['member-management', 'attendance', 'fee-collection', 'member-portal', 'pt-bookings', 'workout-slips', 'advanced-reports', 'priority-support']),
    },
    {
      name: 'Enterprise',
      code: 'ENTERPRISE',
      description: 'Multi-gym chains with dedicated onboarding',
      monthlyPrice: 5999,
      quarterlyPrice: 14999,
      halfYearlyPrice: 28999,
      yearlyPrice: 53999,
      currency: 'INR',
      maxGyms: 10,
      maxMembers: 5000,
      maxTrainers: 100,
      maxStaff: 100,
      maxBranches: 20,
      advancedReports: true,
      features: JSON.stringify(['member-management', 'attendance', 'fee-collection', 'member-portal', 'pt-bookings', 'workout-slips', 'advanced-reports', 'priority-support', 'multi-gym', 'api-access', 'dedicated-manager']),
    },
  ];

  const created: string[] = [];
  for (const p of plans) {
    const existing = await prisma.saaSPlan.findUnique({ where: { code: p.code } });
    if (existing) {
      created.push(existing.id);
    } else {
      const row = await prisma.saaSPlan.create({ data: p });
      created.push(row.id);
    }
  }
  return created;
}

async function seedCMS() {
  const faqCount = await prisma.fAQ.count();
  if (faqCount === 0) {
    await prisma.fAQ.createMany({
      data: [
        { question: 'How do I add new members?', answer: 'Go to Members in your dashboard and click "Add Member". The member receives an activation link to set their own password.', order: 1 },
        { question: 'How are fees and reminders handled?', answer: 'Fees are linked to memberships. Overdue fees and expiring memberships trigger automatic in-app notifications.', order: 2 },
        { question: 'Can members log their own attendance?', answer: 'Yes — approved members can check in through the member portal, and staff can also mark attendance from the desk.', order: 3 },
        { question: 'What happens when my SaaS plan expires?', answer: 'Your gym is auto-suspended until a renewal subscription is created by the platform admin.', order: 4 },
      ],
    });
  }

  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        { name: 'Arjun Mehta', role: 'Gym Owner, Indore', content: 'Vajra Fitness cut our paperwork in half. Members, fees and attendance are all in one place now.', rating: 5 },
        { name: 'Priya Sharma', role: 'Fitness Coach, Mumbai', content: 'Booking PT sessions and tracking my clients has never been easier. My clients love the portal too.', rating: 5 },
        { name: 'Rohan Iyer', role: 'Member, Bengaluru', content: 'Checking in, seeing my workouts and renewing my membership takes seconds. Worth every rupee.', rating: 4 },
      ],
    });
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== '1') {
    console.log('Refusing to seed demo credentials in production. Set ALLOW_PRODUCTION_SEED=1 to override.');
    return;
  }
  console.log('Seeding SaaS plans and CMS content...');
  const saasPlanIds = await seedSaaS();
  await seedCMS();

  const gyms = await prisma.gym.findMany({ include: { membershipPlans: true } });
  if (gyms.length === 0) {
    console.log('No gyms found. Run seedGyms first.');
    return;
  }

  // Wipe any previous demo data so this script is safe to re-run.
  const deleted = await prisma.user.deleteMany({ where: { email: { endsWith: '@demo.in' } } });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} previous demo accounts (cascades to memberships, fees, attendance, etc.).`);
  }

  const hashedPassword = await argon2.hash(DEMO_PASSWORD);

  let globalSeq = 0;
  let memberCount = 0;
  let trainerCount = 0;
  let staffCount = 0;

  for (const gym of gyms) {
    const rand = mulberry32(gym.name.length * 7919 + 13);
    const plans = gym.membershipPlans.filter((p) => p.isActive);
    const defaultPlan = plans[0];
    if (!defaultPlan) {
      console.log(`Skipping ${gym.name} — no active membership plans.`);
      continue;
    }

    const now = new Date();
    const usedBookingKeys = new Set<string>();
    const memberSlots: { user: { id: string; email: string }; detailsId: string; plan: { id: string; name: string; duration: number; price: number } }[] = [];

    // ---- Trainers ----
    const trainerUsers: { id: string; detailsId: string; user: { id: string } }[] = [];
    const trainerSpecializations = pickMany(rand, TRAINER_SPECIALIZATIONS, 5);
    for (let i = 0; i < trainerSpecializations.length; i++) {
      const spec = trainerSpecializations[i]!;
      const first = pick(rand, FIRST_NAMES);
      const last = pick(rand, LAST_NAMES);
      const email = makeEmail(first, last, globalSeq++);
      const joined = new Date(now.getTime() - Math.floor(rand() * 700) * 86400000);
      const user = await prisma.user.create({
        data: {
          username: `${first} ${last}`,
          email,
          password: hashedPassword,
          role: 'TRAINER',
          phone: `9${String(Math.floor(9000000000 + rand() * 999999999)).padStart(10, '0')}`,
        },
      });
      const details = await prisma.trainerDetails.create({
        data: {
          userId: user.id,
          gymId: gym.id,
          specialization: spec,
          joiningDate: joined,
        },
      });
      trainerUsers.push({ id: user.id, detailsId: details.id, user });
      trainerCount++;
    }

    // ---- Staff ----
    const staffUsers: { id: string; user: { id: string } }[] = [];
    const staffRoles = pickMany(rand, STAFF_ROLES, Math.min(4, STAFF_ROLES.length));
    for (const role of staffRoles) {
      const first = pick(rand, FIRST_NAMES);
      const last = pick(rand, LAST_NAMES);
      const email = makeEmail(first, last, globalSeq++);
      const joined = new Date(now.getTime() - Math.floor(rand() * 500) * 86400000);
      const user = await prisma.user.create({
        data: {
          username: `${first} ${last}`,
          email,
          password: hashedPassword,
          role: 'STAFF',
          phone: `9${String(Math.floor(9000000000 + rand() * 999999999)).padStart(10, '0')}`,
          staffDetails: {
            create: {
              gymId: gym.id,
              role,
              joiningDate: joined,
            },
          },
        },
      });
      staffUsers.push({ id: user.id, user });
      staffCount++;
    }

    // ---- Members ----
    const memberCountForGym = 25 + Math.floor(rand() * 15); // 25-40 members
    for (let i = 0; i < memberCountForGym; i++) {
      const first = pick(rand, FIRST_NAMES);
      const last = pick(rand, LAST_NAMES);
      const email = makeEmail(first, last, globalSeq++);
      const plan = pick(rand, plans);
      const joined = new Date(now.getTime() - Math.floor(rand() * 500) * 86400000);

      const user = await prisma.user.create({
        data: {
          username: `${first} ${last}`,
          email,
          password: hashedPassword,
          role: 'MEMBER',
          phone: `9${String(Math.floor(9000000000 + rand() * 999999999)).padStart(10, '0')}`,
          memberDetails: {
            create: {
              gymId: gym.id,
              planId: plan.id,
              joiningDate: joined,
              status: 'ACTIVE',
            },
          },
        },
      });

      const details = await prisma.memberDetails.findUnique({ where: { userId: user.id } });
      if (!details) continue;

      memberSlots.push({
        user: { id: user.id, email },
        detailsId: details.id,
        plan: { id: plan.id, name: plan.name, duration: plan.duration, price: plan.price },
      });

      // Membership lifecycle: mostly ACTIVE, some EXPIRED, few PENDING.
      const roll = rand();
      const isActive = roll < 0.78;
      const isExpired = roll >= 0.78 && roll < 0.93;
      const isPending = roll >= 0.93;

      let startDate: Date;
      let endDate: Date;
      let status: string;
      let paymentStatus: string;

      if (isPending) {
        startDate = new Date(now.getTime() + (3 + Math.floor(rand() * 7)) * 86400000);
        endDate = new Date(startDate.getTime() + plan.duration * 86400000);
        status = 'PENDING';
        paymentStatus = 'PENDING';
      } else if (isExpired) {
        endDate = new Date(now.getTime() - (1 + Math.floor(rand() * 90)) * 86400000);
        startDate = new Date(endDate.getTime() - plan.duration * 86400000);
        status = 'EXPIRED';
        paymentStatus = 'PAID';
      } else {
        startDate = new Date(now.getTime() - (20 + Math.floor(rand() * 120)) * 86400000);
        endDate = new Date(startDate.getTime() + plan.duration * 86400000);
        if (endDate < now) {
          endDate = new Date(now.getTime() + 10 * 86400000);
        }
        status = 'ACTIVE';
        paymentStatus = rand() < 0.15 ? 'OVERDUE' : 'PAID';
      }

      const discount = rand() < 0.2 ? Math.round((plan.price * 0.05) / PLAN_CURRENCY_FACTOR) : 0;
      const finalAmount = plan.price - discount;

      const membership = await prisma.membership.create({
        data: {
          memberId: details.id,
          gymId: gym.id,
          planId: plan.id,
          startDate,
          endDate,
          originalAmount: plan.price,
          discount,
          finalAmount,
          paymentStatus,
          status,
          paymentMethod: paymentStatus === 'PAID' ? (rand() < 0.5 ? 'CASH' : 'UPI') : null,
          transactionId: paymentStatus === 'PAID' ? `DEMO${Date.now().toString(36)}${Math.floor(rand() * 9999)}` : null,
          notes: status === 'ACTIVE' ? 'Seeded demo membership' : null,
        },
      });

      // One fee record per membership.
      const dueDate = new Date(startDate);
      const feeStatus = paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'OVERDUE' ? 'OVERDUE' : 'PENDING';
      await prisma.fee.create({
        data: {
          memberId: details.id,
          gymId: gym.id,
          membershipId: membership.id,
          amount: finalAmount,
          dueDate,
          paymentDate: feeStatus === 'PAID' ? new Date(startDate.getTime() + Math.floor(rand() * 3) * 86400000) : now,
          status: feeStatus,
          paymentMethod: feeStatus === 'PAID' ? (rand() < 0.5 ? 'CASH' : 'UPI') : null,
          notes: null,
        },
      });

      // Attendance for active members over the last 30 days.
      if (status === 'ACTIVE') {
        for (let d = 30; d >= 1; d--) {
          if (rand() > 0.72) continue; // ~28% skip days
          const checkIn = randomCheckIn(rand);
          checkIn.setDate(now.getDate() - d);
          if (checkIn > now) continue;
          await prisma.attendance.create({
            data: {
              memberId: details.id,
              gymId: gym.id,
              checkIn,
              status: 'PRESENT',
            },
          });
        }
      }

      // A workout slip for about 3/4 of members.
      if (rand() < 0.75 && trainerUsers.length > 0) {
        const trainer = pick(rand, trainerUsers);
        const exercises = pickMany(rand, EXERCISES, 5 + Math.floor(rand() * 3));
        await prisma.workoutSlip.create({
          data: {
            memberId: details.id,
            trainerId: trainer.detailsId,
            gymId: gym.id,
            title: `${first}'s ${plan.name} Program`,
            exercises: exercises.join(', '),
            assignedDate: joined,
            validUntil: new Date(joined.getTime() + plan.duration * 86400000),
          },
        });
      }

      // A couple of notifications per member.
      const notifType = status === 'ACTIVE' ? 'SUCCESS' : status === 'EXPIRED' ? 'WARNING' : 'INFO';
      await prisma.notification.createMany({
        data: [
          {
            userId: user.id,
            type: 'SUCCESS',
            title: 'Welcome to the gym!',
            message: `Your ${plan.name} membership has been activated. See you at the gym!`,
            isRead: false,
          },
          {
            userId: user.id,
            type: notifType,
            title: status === 'EXPIRED' ? 'Membership expired' : status === 'PENDING' ? 'Membership starts soon' : 'Workout update',
            message: status === 'EXPIRED' ? 'Your membership has expired. Renew to keep training.' : status === 'PENDING' ? `Your membership starts on ${startDate.toLocaleDateString()}.` : 'A new workout program has been assigned to you.',
            isRead: rand() < 0.5,
          },
        ],
      });

      memberCount++;
    }

    // ---- Bookings (PT) ----
    const bookingTimes = ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'];
    const bookingSlots = 8 + Math.floor(rand() * 8);
    for (let i = 0; i < bookingSlots; i++) {
      const member = pick(rand, memberSlots);
      const trainer = pick(rand, trainerUsers);
      const date = new Date(now.getTime() + Math.floor(rand() * 30 - 15) * 86400000);
      const dateStr = date.toISOString().slice(0, 10);
      const time = pick(rand, bookingTimes);
      const key = `${trainer.id}|${dateStr}|${time}`;
      if (usedBookingKeys.has(key)) continue;
      usedBookingKeys.add(key);

      const isPast = date < now;
      const status = isPast ? (rand() < 0.85 ? 'COMPLETED' : 'CANCELLED') : rand() < 0.6 ? 'CONFIRMED' : 'PENDING';

      await prisma.booking.create({
        data: {
          userId: member.user.id,
          trainerId: trainer.id,
          gymId: gym.id,
          date: dateStr,
          time,
          status,
          notes: status === 'COMPLETED' ? 'Session went well.' : null,
        },
      });
    }

    // ---- Enquiries ----
    const enquiries = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < enquiries; i++) {
      const first = pick(rand, FIRST_NAMES);
      const last = pick(rand, LAST_NAMES);
      const statusRoll = rand();
      const status = statusRoll < 0.5 ? 'CONVERTED' : statusRoll < 0.8 ? 'CLOSED' : 'PENDING';
      await prisma.enquiry.create({
        data: {
          gymId: gym.id,
          name: `${first} ${last}`,
          phone: `9${String(Math.floor(9000000000 + rand() * 999999999)).padStart(10, '0')}`,
          email: makeEmail(first, last, globalSeq++),
          notes: 'Walked in asking about membership plans.',
          status,
          date: new Date(now.getTime() - Math.floor(rand() * 30) * 86400000),
        },
      });
    }

    // ---- Owner notifications ----
    const existingOwnerNotifs = await prisma.notification.count({
      where: { userId: gym.ownerId, title: 'Gym approved' },
    });
    if (existingOwnerNotifs === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: gym.ownerId,
            type: 'SUCCESS',
            title: 'Gym approved',
            message: `${gym.name} is live on the platform.`,
            isRead: false,
          },
          {
            userId: gym.ownerId,
            type: 'INFO',
            title: `${memberCountForGym} members onboarded`,
            message: 'Demo member data has been seeded for evaluation.',
            isRead: false,
          },
        ],
      });
    }

    // ---- SaaS subscription for this gym (skip if one is already active) ----
    const existingSub = await prisma.gymSubscription.findFirst({
      where: { gymId: gym.id, status: 'ACTIVE' },
    });
    if (!existingSub) {
      const saasPlanId = pick(rand, saasPlanIds);
      const saasPlan = await prisma.saaSPlan.findUnique({ where: { id: saasPlanId } });
      await prisma.gymSubscription.create({
        data: {
          gymId: gym.id,
          planId: saasPlanId,
          status: 'ACTIVE',
          startDate: new Date(now.getTime() - 20 * 86400000),
          endDate: new Date(now.getTime() + 310 * 86400000),
          amount: saasPlan?.monthlyPrice ?? 999,
        },
      });
    }

    console.log(
      `Seeded ${gym.name}: ${memberCountForGym} members, ${trainerSpecializations.length} trainers, ${staffRoles.length} staff, ${bookingSlots} bookings, ${enquiries} enquiries.`,
    );
  }

  console.log(`\nDone. Created ${memberCount} members, ${trainerCount} trainers, ${staffCount} staff across ${gyms.length} gyms.`);
  console.log(`Demo accounts (seed only): password "${DEMO_PASSWORD}" (e.g. first.last1@demo.in).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
