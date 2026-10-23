import { cx } from './cx';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-surface-sunken text-ink-muted',
};

const STATUSES: Record<string, [string, Tone]> = {
  ACTIVE: ['Active', 'success'],
  PAID: ['Paid', 'success'],
  APPROVED: ['Approved', 'success'],
  COMPLETED: ['Completed', 'success'],
  CONFIRMED: ['Confirmed', 'success'],
  PENDING: ['Pending', 'warning'],
  EXPIRING_SOON: ['Expiring soon', 'warning'],
  GRACE_PERIOD: ['Grace period', 'warning'],
  TRIAL: ['Trial', 'info'],
  PARTIALLY_REFUNDED: ['Partly refunded', 'info'],
  EXPIRED: ['Expired', 'danger'],
  OVERDUE: ['Overdue', 'danger'],
  SUSPENDED: ['Suspended', 'danger'],
  REJECTED: ['Rejected', 'danger'],
  REFUNDED: ['Refunded', 'neutral'],
  CANCELLED: ['Cancelled', 'neutral'],
};

const humanise = (value: string) => {
  const text = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function statusLabel(status: string) {
  return STATUSES[status.toUpperCase()]?.[0] ?? humanise(status);
}

type StatusBadgeProps = {
  status: string;
  /** Overrides the mapped label, e.g. "Expires in 3 days". */
  label?: string;
  tone?: Tone;
  className?: string;
};

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const [mappedLabel, mappedTone] = STATUSES[status.toUpperCase()] ?? [humanise(status), 'neutral'];
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[tone ?? mappedTone], className)}>
      {label ?? mappedLabel}
    </span>
  );
}
