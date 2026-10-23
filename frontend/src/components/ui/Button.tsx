import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-sunken',
  ghost: 'text-ink hover:bg-surface-sunken',
  danger: 'bg-danger text-on-accent hover:brightness-110',
};

// sm stays 44px tall on touch screens and tightens to 36px from the sm breakpoint.
const SIZES: Record<Size, string> = {
  sm: 'min-h-11 sm:min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-[background-color,border-color,color,filter] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  /** Renders a react-router Link with button styling. */
  to?: string;
};

export function Button({ variant, size, loading = false, icon: Icon, to, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const classes = buttonClasses(variant, size, className);
  const content: ReactNode = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: LucideIcon;
  /** Accessible name; also shown as the native tooltip. */
  label: string;
  variant?: Exclude<Variant, 'primary' | 'danger'>;
};

export function IconButton({ icon: Icon, label, variant = 'ghost', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'secondary' && 'border border-line-strong bg-surface',
        className,
      )}
      {...rest}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
