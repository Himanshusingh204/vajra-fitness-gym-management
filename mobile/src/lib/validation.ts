import { z } from 'zod';

// Same rules as backend/src/utils/validators.ts so most mistakes are caught
// before a round trip. The server still validates everything.
const INDIAN_MOBILE = /^(\+?91[\s-]?)?([6-9]\d{9})$/;

export const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters')
  .regex(/^[^<>{}[\]\\^`;]*$/, 'Name contains characters that are not allowed');

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use at most 128 characters')
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), 'Include at least one letter and one number');

export const phone = z
  .string()
  .trim()
  .refine((v) => INDIAN_MOBILE.test(v.replace(/[\s-]/g, '')), 'Enter a 10 digit Indian mobile number');

export const optionalPhone = z.union([phone, z.literal('')]);
