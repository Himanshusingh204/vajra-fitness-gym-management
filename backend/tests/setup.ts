// Runs in every test worker before the suite files. Resets the database before
// each test so suites are isolated from one another. Env vars are injected by
// vitest.config.ts (test.env) before this file runs.
import { prisma } from '../src/utils/prisma';

const TABLES = [
  'NutritionPlan',
  'ProgressLog',
  'Booking',
  'AuditLog',
  'SupportTicket',
  'Testimonial',
  'FAQ',
  'SiteContent',
  'Notice',
  'Enquiry',
  'Attendance',
  'WorkoutSlip',
  'GymSubscription',
  'SaaSPlan',
  'RefreshToken',
  'PasswordResetToken',
  'ActivationToken',
  'Notification',
  'Membership',
  'Fee',
  'StaffDetails',
  'TrainerDetails',
  'MemberDetails',
  'MembershipPlan',
  'Gym',
  'User',
];

beforeEach(async () => {
  await prisma.$transaction([
    ...TABLES.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
