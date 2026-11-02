import type { FieldError } from 'react-hook-form';
import * as z from 'zod';

export const errorInput = 'border-red-500! focus:ring-red-500/20!';
export const footerLink = 'font-semibold text-[var(--color-primary)] hover:underline';

// Props for an input registered with react-hook-form, wiring up the error message for screen readers.
export const a11y = (id: string, error?: FieldError) => ({
  id,
  'aria-invalid': !!error,
  'aria-describedby': error ? `${id}-error` : undefined,
});

// Mirrors the backend register validators so most mistakes are caught before submitting.
export const accountFields = z.object({
  username: z.string().trim().min(2, 'Enter your full name').max(60, 'Keep it under 60 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number').refine((v) => {
      const local = v.replace(/^\+?91/, '');
      return !/^(\d)\1{9}$/.test(local) && !/^(0123456789|1234567890|9876543210)$/.test(local);
    }, 'Enter a valid Indian mobile number')),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128)
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), 'Use at least one letter and one number'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((v) => v, 'Please accept the terms to continue'),
});

export const passwordsMatch = <T extends { password: string; confirmPassword: string }>(v: T) => v.password === v.confirmPassword;
export const mismatch = { message: 'Passwords do not match', path: ['confirmPassword'] };

// react-hook-form focuses errors in register() order, which is not DOM order when a page
// registers its own fields before <AccountFields>. Focus the first invalid input on screen instead.
export const focusFirstError = () =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus());

export const applyServerFieldIssues = <T extends string>(
  issues: Array<{ path?: string; message?: string }>,
  fields: Record<string, string>,
  setFieldError: (name: T, error: { type: string; message: string }) => void,
) => {
  let firstField: string | undefined;
  for (const issue of issues) {
    const field = issue.path?.split('.')[0];
    if (field && fields[field]) {
      setFieldError(field as T, { type: 'server', message: issue.message || 'Please check this field' });
      firstField ??= fields[field];
    }
  }
  if (firstField) requestAnimationFrame(() => document.getElementById(firstField!)?.focus());
  return Boolean(firstField);
};
