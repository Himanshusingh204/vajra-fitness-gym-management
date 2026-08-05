import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();
const username = z.string().trim().min(2).max(60);
const phone = z.string().trim().min(5).max(20).optional().or(z.literal('').transform(() => undefined));
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
    message: 'Password must contain at least one letter and one number',
  });
const dateStr = z
  .string()
  .trim()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' });
const uuid = z.string().uuid();

export const registerVendorSchema = z.object({
  username,
  email,
  password,
  gymName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  location: z.string().trim().max(300).optional().nullable(),
  gstNumber: z.string().trim().max(40).optional().nullable(),
  phone,
});

export const registerMemberSchema = z.object({
  username,
  email,
  password,
  phone,
  gymId: uuid,
  planId: uuid.optional().nullable(),
});

export const loginSchema = z.object({
  email: email,
  password: z.string().min(1).max(128),
});

export const activateAccountSchema = z.object({
  token: z.string().trim().min(10).max(256),
  password,
});

export const forgotPasswordSchema = z.object({
  email: email,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(256),
  newPassword: password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

export const planSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  duration: z.number().int().positive().max(3650),
  price: z.number().positive().max(1e7),
  gymId: uuid,
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  duration: z.number().int().positive().max(3650),
  price: z.number().positive().max(1e7),
  isActive: z.boolean().optional(),
});

const memberStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']);

export const memberAddSchema = z.object({
  username,
  email,
  phone,
  planId: uuid.optional().nullable(),
  status: memberStatus.optional(),
});

export const updateMemberSchema = z.object({
  status: memberStatus.optional(),
  planId: uuid.optional().nullable(),
});

export const enrollSchema = z.object({
  gymId: uuid,
  planId: uuid.optional().nullable(),
});

const paymentMethod = z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional().nullable();

export const recordFeeSchema = z.object({
  memberId: uuid,
  amount: z.number().positive().max(1e8),
  paymentDate: dateStr.optional(),
  dueDate: dateStr,
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'PARTIAL']).optional(),
  paymentMethod,
  transactionId: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  membershipId: uuid.optional().nullable(),
});

export const updateFeeStatusSchema = z.object({
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'PARTIAL']),
  paymentMethod,
  transactionId: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createMembershipSchema = z.object({
  memberId: uuid,
  planId: uuid.optional().nullable(),
  startDate: dateStr.optional(),
  discount: z.number().min(0).max(1e7).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
  paymentMethod,
  transactionId: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const renewMembershipSchema = z.object({
  membershipId: uuid,
  planId: uuid.optional().nullable(),
  discount: z.number().min(0).max(1e7).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
  paymentMethod,
  transactionId: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const staffAddSchema = z.object({
  username,
  email,
  phone,
  roleType: z.enum(['TRAINER', 'STAFF']),
  roleSpecifics: z.string().trim().min(2).max(80),
});

export const workoutSlipSchema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  exercises: z.string().trim().min(1).max(5000),
  validUntil: dateStr.optional().nullable(),
  trainerId: uuid.optional().nullable(),
});

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(20),
  email: email.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
  email,
  subject: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().min(5).max(3000),
});

export const updateEnquirySchema = z.object({
  status: z.enum(['PENDING', 'CONVERTED', 'CLOSED']).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(3000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const ticketAdminSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const gymUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(3).max(300).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  location: z.string().trim().max(300).optional().nullable(),
  gstNumber: z.string().trim().max(40).optional().nullable(),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  facilities: z.string().trim().max(2000).optional().nullable(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(2000),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

export const updateFaqSchema = faqSchema.partial();

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(100),
  content: z.string().trim().min(3).max(1000),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional(),
  isActive: z.boolean().optional(),
});

export const updateTestimonialSchema = testimonialSchema.partial();

// ---- Personal trainer bookings ----
const bookingTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time (HH:mm)');
const bookingDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)')
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' });

export const createBookingSchema = z.object({
  trainerId: uuid,
  date: bookingDate,
  time: bookingTime,
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
});

// ---- Progress logging ----
export const progressSchema = z.object({
  weight: z.number().positive().max(500),
  height: z.number().positive().max(300).optional().nullable(),
  bodyFat: z.number().positive().max(100).optional().nullable(),
});

// ---- Nutrition plans ----
export const nutritionPlanSchema = z.object({
  title: z.string().trim().min(2).max(120),
  calories: z.number().int().positive().max(10000).optional().nullable(),
  meals: z
    .string()
    .max(8000)
    .refine((s) => {
      try {
        const v = JSON.parse(s);
        return Array.isArray(v);
      } catch {
        return false;
      }
    }, { message: 'meals must be a JSON array string' })
    .optional()
    .default('[]'),
});

// ---- Vajra SaaS plans (sold to gym owners) ----
export const saasPlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.number().nonnegative().max(1e7),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  maxGyms: z.number().int().nonnegative().max(1000).optional(),
  maxMembers: z.number().int().nonnegative().max(1e7).optional().nullable(),
  maxTrainers: z.number().int().nonnegative().max(1e6).optional().nullable(),
  maxStaff: z.number().int().nonnegative().max(1e6).optional().nullable(),
  advancedReports: z.boolean().optional(),
  features: z.array(z.string().trim().min(1).max(200)).optional(),
  isActive: z.boolean().optional(),
});

export const saasPlanUpdateSchema = saasPlanSchema.partial();

export const subscriptionSchema = z.object({
  gymId: uuid,
  planId: uuid,
  startDate: dateStr.optional(),
});

export const subscriptionStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'CANCELLED']),
});
