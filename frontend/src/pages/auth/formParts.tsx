import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { FieldError } from 'react-hook-form';
import { footerLink } from './authForm';

export const Field = ({ id, label, error, children }: { id: string; label: string; error?: FieldError; children: ReactNode }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">
      {label}
    </label>
    {children}
    {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error.message}</p>}
  </div>
);

export const Banner = ({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) =>
  tone === 'error' ? (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </div>
  ) : (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </div>
  );

export const SubmitButton = ({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) => (
  <button
    type="submit"
    disabled={busy}
    className="group flex h-14 w-full cursor-pointer items-center justify-between rounded-full bg-[var(--color-primary)] pl-7 pr-2 text-base font-semibold text-white transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-ring)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
  >
    {busy ? busyLabel : children}
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105">
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
      ) : (
        <ArrowRight strokeWidth={1.75} className="h-4 w-4" />
      )}
    </span>
  </button>
);

export const FormFooter = ({ children }: { children: ReactNode }) => (
  <p className="mt-7 text-center text-sm text-[var(--color-muted)]">{children}</p>
);

export const TermsLabel = () => (
  <>
    I agree to the{' '}
    <Link to="/terms" target="_blank" className={footerLink}>Terms</Link> and{' '}
    <Link to="/privacy" target="_blank" className={footerLink}>Privacy Policy</Link>
  </>
);

