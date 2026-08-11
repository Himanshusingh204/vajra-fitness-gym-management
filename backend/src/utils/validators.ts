import { z } from 'zod';
export { z };

// ---- Indian mobile number validation ----
// Accepts "XXXXXXXXXX" (10 digits) or "+91XXXXXXXXXX". Rejects:
//  - too short / too long / 20+ digit inputs
//  - alphabetic / special characters
//  - leading digits not valid for Indian mobile numbering (2-9)
//  - obviously fake repeated/sequential numbers
const INDIAN_MOBILE_RE = /^(\+?91[\s-]?)?([6-9]\d{9})$/;
const REJECT_PATTERNS = [/^(\d)\1{9}$/, /^(0123456789|1234567890|9876543210)$/];

const normalizeIndianMobile = (value: string): string | null => {
  const trimmed = value.replace(/[\s-]/g, '');
  const match = trimmed.match(INDIAN_MOBILE_RE);
  if (!match) return null;
  const local = match[2]!;
  if (REJECT_PATTERNS.some((re) => re.test(local))) return null;
  return local;
};

const indianPhone = (field = 'phone') =>
  z
    .string({ message: `${field} must be a string` })
    .trim()
    .min(10, `${field} must be a 10-digit Indian mobile number`)
    .max(16, `${field} must be a valid Indian mobile number`)
    .refine((v) => normalizeIndianMobile(v) !== null, {
      message: `${field} must be a valid Indian mobile number (10 digits, starting 6-9, +91 optional)`,
    });

const optionalIndianPhone = (field = 'phone') =>
  z
    .union([indianPhone(field), z.literal(''), z.literal(null)])
    .optional()
    .transform((v) => (v ? normalizeIndianMobile(v) : undefined));

// ---- Common field helpers ----
const email = z.string().trim().toLowerCase().email('A valid email is required').max(254);
const username = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters')
  .regex(/^[^<>{}[\]\\^`;]*$/, 'Name contains invalid characters');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
    message: 'Password must contain at least one letter and one number',
  });
// ---- Date validators ----
// Basic validity: must parse to a real date.
const dateStr = z
  .string()
  .trim()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' });

// Past-or-today date (for paymentDate, startDate, DOB, etc.) — rejects future dates.
const pastOrTodayDate = z
  .string()
  .trim()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' })
  .refine((s) => {
    const d = new Date(s);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d <= today;
  }, { message: 'Date cannot be in the future' });

// Future date (for dueDate, membership end dates, expiry, etc.).
const futureDate = z
  .string()
  .trim()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' })
  .refine((s) => {
    const d = new Date(s);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d >= now;
  }, { message: 'Date must be today or in the future' });
const uuid = z.string().uuid('A valid id is required');

// Pincode: exactly 6 digits, numeric only (India).
const pincode = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Pincode must be exactly 6 digits');

// Strips HTML/script content from free-text fields. This is a sanitization
// layer on top of zod; combined with React's escaping on the client it
// prevents stored-XSS via user-supplied names, addresses and notes.
const sanitize = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .transform((v) => v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));

// ---- Re-usable schemas ----
export const nameSchema = username;
export const emailSchema = email;
export const phoneSchema = indianPhone();
export const optionalPhoneSchema = optionalIndianPhone();

// ---- URL param validators (used with validate(schema, ['params'])) ----
export const idParams = z.object({ id: uuid });
export const gymIdParams = z.object({ gymId: uuid });
export const memberIdParams = z.object({ memberId: uuid });
export const classIdParams = z.object({ classId: uuid });
export const trainerIdParams = z.object({ trainerId: uuid });
export const productIdParams = z.object({ id: uuid });
export const subscriptionIdParams = z.object({ id: uuid });
export const userIdParams = z.object({ id: uuid });
export const faqIdParams = z.object({ id: uuid });
export const testimonialIdParams = z.object({ id: uuid });
export const branchIdParams = z.object({ id: uuid });
export const saleIdParams = z.object({ id: uuid });

// ---- Query string validators ----
export const dateRangeQuery = z
  .object({
    from: dateStr.optional(),
    to: dateStr.optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'from must be on or before to' });

export const statusQuery = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED', 'PAID', 'OVERDUE', 'PARTIAL']).optional(),
});

export const registerVendorSchema = z.object({
  username,
  email,
  password,
  gymName: sanitize(120).pipe(z.string().min(2, 'Gym name must be at least 2 characters')),
  address: sanitize(300).pipe(z.string().min(3, 'Address must be at least 3 characters')),
  city: sanitize(80).pipe(z.string().min(2, 'City must be at least 2 characters')),
  state: sanitize(80).pipe(z.string().min(2, 'State must be at least 2 characters')),
  pincode: pincode.optional().nullable(),
  location: sanitize(300).optional().nullable(),
  gstNumber: z.string().trim().max(40).optional().nullable(),
  phone: indianPhone().optional().or(z.literal('').transform(() => undefined)),
});

export const registerMemberSchema = z.object({
  username,
  email,
  password,
  phone: optionalIndianPhone(),
  gymId: uuid,
  planId: uuid.optional().nullable(),
  preferredPaymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional().nullable(),
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

const memberStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'EXPIRED', 'FROZEN']);

export const memberAddSchema = z.object({
  username,
  email,
  phone: optionalIndianPhone(),
  planId: uuid.optional().nullable(),
  status: memberStatus.optional(),
  branchId: uuid.optional().nullable(),
});

// Bulk CSV member import: raw CSV text with a username,email[,phone] header row.
export const memberImportSchema = z.object({
  csv: z.string().trim().min(1, 'CSV content is required'),
  planId: uuid.optional().nullable(),
});

export const updateMemberSchema = z.object({
  status: memberStatus.optional(),
  planId: uuid.optional().nullable(),
  branchId: uuid.optional().nullable(),
});

export const enrollSchema = z.object({
  gymId: uuid,
  planId: uuid.optional().nullable(),
  preferredPaymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional().nullable(),
});

// Staff marks attendance for either a member or a fellow staff member (one required).
export const markAttendanceSchema = z
  .object({
    memberId: uuid.optional(),
    staffId: uuid.optional(),
  })
  .refine((v) => v.memberId || v.staffId, { message: 'memberId or staffId is required' });

// Gym owners purchase a SaaS plan for their gym. Super Admins may pass gymId for another gym.
export const subscriptionPurchaseSchema = z.object({
  planId: uuid,
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
  gymId: uuid.optional(),
});

const paymentMethod = z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional().nullable();

export const recordFeeSchema = z.object({
  memberId: uuid,
  amount: z.number().positive().max(1e8),
  paymentDate: pastOrTodayDate.optional(),
  dueDate: futureDate,
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

// ---- Razorpay online payments ----
const razorpayId = z.string().trim().min(6).max(64).regex(/^[a-zA-Z0-9_]+$/);

export const checkoutSchema = z.object({
  feeId: uuid,
});

export const verifyPaymentSchema = z.object({
  orderId: razorpayId,
  paymentId: razorpayId,
  signature: z.string().trim().length(64),
});

export const createMembershipSchema = z.object({
  memberId: uuid,
  planId: uuid.optional().nullable(),
  startDate: pastOrTodayDate.optional(),
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
  phone: indianPhone('phone').optional().or(z.literal('').transform(() => undefined)),
  roleType: z.enum(['TRAINER', 'STAFF']),
  roleSpecifics: sanitize(80).pipe(z.string().min(2, 'Role specifics must be at least 2 characters')),
  branchId: uuid.optional().nullable(),
});

export const workoutSlipSchema = z.object({
  title: z.string().trim().max(120).optional().nullable(),
  exercises: z.string().trim().min(1).max(5000),
  validUntil: futureDate.optional().nullable(),
  trainerId: uuid.optional().nullable(),
});

export const enquirySchema = z.object({
  name: sanitize(100).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  phone: indianPhone(),
  email: email.optional().nullable(),
  notes: sanitize(2000).optional().nullable(),
});

export const contactSchema = z.object({
  name: sanitize(100).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  phone: optionalIndianPhone(),
  email,
  subject: sanitize(200).optional().nullable(),
  // Max 1000 words AND a hard 6000-char server-side cap (belt and braces).
  message: sanitize(6000).pipe(
    z
      .string()
      .min(5, 'Message must be at least 5 characters')
      .refine((v) => v.split(/\s+/).filter(Boolean).length <= 1000, {
        message: 'Message must not exceed 1000 words',
      }),
  ),
});

export const updateEnquirySchema = z.object({
  status: z.enum(['PENDING', 'CONVERTED', 'CLOSED']).optional(),
  notes: sanitize(2000).optional().nullable(),
});

export const ticketSchema = z.object({
  subject: sanitize(200).pipe(z.string().min(3, 'Subject must be at least 3 characters')),
  message: sanitize(3000).pipe(z.string().min(5, 'Message must be at least 5 characters')),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const ticketAdminSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const gymUpdateSchema = z.object({
  name: sanitize(120).pipe(z.string().min(2, 'Name must be at least 2 characters')).optional(),
  address: sanitize(300).pipe(z.string().min(3, 'Address must be at least 3 characters')).optional(),
  city: sanitize(80).pipe(z.string().min(2, 'City must be at least 2 characters')).optional(),
  state: sanitize(80).pipe(z.string().min(2, 'State must be at least 2 characters')).optional(),
  pincode: pincode.optional().nullable(),
  location: sanitize(300).optional().nullable(),
  gstNumber: z.string().trim().max(40).optional().nullable(),
  logoUrl: z.string().trim().url('A valid image URL is required').max(1000).optional().nullable(),
  imageUrl: z.string().trim().url('A valid image URL is required').max(1000).optional().nullable(),
  facilities: sanitize(2000).optional().nullable(),
  // White-label branding
  brandColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Brand color must be a hex value like #800020')
    .optional()
    .nullable(),
  tagline: sanitize(160).optional().nullable(),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/, 'Subdomain must be 3-30 characters: lowercase letters, numbers and hyphens')
    .optional()
    .nullable(),
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/, 'Custom domain must be a valid domain like gym.example.com')
    .optional()
    .nullable(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

// ---- Branches (multi-location support) ----
export const branchCreateSchema = z.object({
  name: sanitize(120).pipe(z.string().min(2, 'Branch name must be at least 2 characters')),
  address: sanitize(300).pipe(z.string().min(3, 'Address must be at least 3 characters')),
  city: sanitize(80).pipe(z.string().min(2, 'City must be at least 2 characters')),
  state: sanitize(80).pipe(z.string().min(2, 'State must be at least 2 characters')),
  phone: optionalIndianPhone(),
});

export const branchUpdateSchema = z.object({
  name: sanitize(120).pipe(z.string().min(2, 'Branch name must be at least 2 characters')).optional(),
  address: sanitize(300).pipe(z.string().min(3, 'Address must be at least 3 characters')).optional(),
  city: sanitize(80).pipe(z.string().min(2, 'City must be at least 2 characters')).optional(),
  state: sanitize(80).pipe(z.string().min(2, 'State must be at least 2 characters')).optional(),
  phone: optionalIndianPhone(),
  isActive: z.boolean().optional(),
});

export const branchRejectSchema = z.object({
  reason: sanitize(500).pipe(z.string().min(3, 'Please provide a reason')).optional(),
});

export const faqSchema = z.object({
  question: sanitize(300).pipe(z.string().min(3, 'Question must be at least 3 characters')),
  answer: sanitize(2000).pipe(z.string().min(3, 'Answer must be at least 3 characters')),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

export const noticeSchema = z.object({
  title: sanitize(150).pipe(z.string().min(2, 'Title must be at least 2 characters')),
  content: sanitize(3000).pipe(z.string().min(2, 'Content must be at least 2 characters')),
});

export const updateNoticeSchema = noticeSchema.partial();

export const updateFaqSchema = faqSchema.partial();

export const testimonialSchema = z.object({
  name: sanitize(100).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  role: sanitize(100).pipe(z.string().min(2, 'Role must be at least 2 characters')),
  content: sanitize(1000).pipe(z.string().min(3, 'Content must be at least 3 characters')),
  imageUrl: z.string().trim().url('A valid image URL is required').max(1000).optional().nullable(),
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
  name: sanitize(100).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(40)
    .regex(/^[A-Z0-9_]+$/, 'Code may only contain uppercase letters, digits and underscores'),
  description: sanitize(500).optional().nullable(),
  monthlyPrice: z.number().nonnegative().max(1e7).default(0),
  quarterlyPrice: z.number().nonnegative().max(1e7).default(0),
  halfYearlyPrice: z.number().nonnegative().max(1e7).default(0),
  yearlyPrice: z.number().nonnegative().max(1e7).default(0),
  currency: z.string().trim().min(3).max(3).default('INR'),
  maxGyms: z.number().int().nonnegative().max(1000).optional(),
  maxMembers: z.number().int().nonnegative().max(1e7).optional().nullable(),
  maxTrainers: z.number().int().nonnegative().max(1e6).optional().nullable(),
  maxStaff: z.number().int().nonnegative().max(1e6).optional().nullable(),
  maxBranches: z.number().int().nonnegative().max(1000).optional(),
  maxClasses: z.number().int().nonnegative().max(1e6).optional().nullable(),
  maxStorageMB: z.number().int().nonnegative().max(1e6).optional().nullable(),
  advancedReports: z.boolean().optional(),
  features: z.array(z.string().trim().min(1).max(200)).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const saasPlanUpdateSchema = saasPlanSchema.partial();

export const subscriptionSchema = z.object({
  gymId: uuid,
  planId: uuid,
  startDate: pastOrTodayDate.optional(),
});

export const subscriptionStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'CANCELLED']),
});
