import * as z from 'zod';
import { isAxiosError } from 'axios';

export const nameField = z.string().trim().min(2, 'Enter at least 2 characters').max(60, 'Keep it under 60 characters');
export const emailField = z.string().trim().email('Enter a valid email address');

export const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Keep it under 128 characters')
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

const PHONE = /^(\+?91)?[6-9]\d{9}$/;
const stripPhone = (v: string) => v.replace(/[\s-]/g, '');
const PHONE_MESSAGE = 'Enter a 10-digit mobile number starting with 6 to 9';

export const phoneField = z.string().refine((v) => PHONE.test(stripPhone(v)), PHONE_MESSAGE);

export const optionalPhoneField = z
  .string()
  .refine((v) => v.trim() === '' || PHONE.test(stripPhone(v)), PHONE_MESSAGE);

export const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.';

export function apiError(err: unknown, fallback = 'Something went wrong. Try again.') {
  if (!isAxiosError(err)) return fallback;
  if (!err.response) return 'Cannot reach the server. Check your connection and try again.';
  if (err.response.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  const data = err.response.data as { error?: unknown } | undefined;
  return typeof data?.error === 'string' ? data.error : fallback;
}

/** Only same-site paths are followed after login. */
export function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null;
}
