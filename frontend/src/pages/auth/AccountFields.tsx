import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type * as z from 'zod';
import { Mail, Phone, User } from 'lucide-react';
import PasswordInput from './PasswordInput';
import { Field, TermsLabel } from './formParts';
import { a11y, errorInput } from './authForm';
import type { accountFields } from './authForm';

type AccountValues = z.input<typeof accountFields>;

const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]';

// Name, email, phone and password, shared by every sign-up form.
export const AccountFields = ({ register, errors }: { register: UseFormRegister<any>; errors: FieldErrors<AccountValues> }) => (
  <>
    <Field id="reg-name" label="Full name" error={errors.username}>
      <div className="relative">
        <User className={iconClass} />
        <input {...a11y('reg-name', errors.username)} autoComplete="name" {...register('username')} className={`input-field pl-10 ${errors.username ? errorInput : ''}`} placeholder="Your name" />
      </div>
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="reg-email" label="Email address" error={errors.email}>
        <div className="relative">
          <Mail className={iconClass} />
          <input {...a11y('reg-email', errors.email)} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...register('email')} className={`input-field pl-10 ${errors.email ? errorInput : ''}`} placeholder="you@example.com" />
        </div>
      </Field>
      <Field id="reg-phone" label="Mobile number" error={errors.phone}>
        <div className="relative">
          <Phone className={iconClass} />
          <input {...a11y('reg-phone', errors.phone)} type="tel" autoComplete="tel" {...register('phone')} className={`input-field pl-10 ${errors.phone ? errorInput : ''}`} placeholder="98765 43210" />
        </div>
      </Field>
      <Field id="reg-password" label="Password" error={errors.password}>
        <PasswordInput {...a11y('reg-password', errors.password)} aria-describedby={errors.password ? 'reg-password-error reg-password-help' : 'reg-password-help'} autoComplete="new-password" {...register('password')} className={errors.password ? errorInput : ''} placeholder="8+ characters" />
        <p id="reg-password-help" className="mt-1.5 text-xs text-[var(--color-muted)]">At least 8 characters, with one letter and one number.</p>
      </Field>
      <Field id="reg-confirm" label="Confirm password" error={errors.confirmPassword}>
        <PasswordInput {...a11y('reg-confirm', errors.confirmPassword)} autoComplete="new-password" {...register('confirmPassword')} className={errors.confirmPassword ? errorInput : ''} placeholder="Repeat password" />
      </Field>
    </div>
  </>
);

export const TermsField = ({ register, errors }: { register: UseFormRegister<any>; errors: FieldErrors<AccountValues> }) => (
  <div>
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--color-charcoal)]">
      <input type="checkbox" {...a11y('reg-terms', errors.terms)} {...register('terms')} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-primary)]" />
      <span><TermsLabel /></span>
    </label>
    {errors.terms && <p id="reg-terms-error" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.terms.message}</p>}
  </div>
);
