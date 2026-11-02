export type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  RESOLVED: 'success',
  VERIFIED: 'success',
  SETTLED: 'success',
  CONFIRMED: 'success',
  PRESENT: 'success',

  PENDING: 'warn',
  PENDING_REVIEW: 'warn',
  CHANGES_REQUESTED: 'warn',
  PARTIAL: 'warn',
  TRIAL: 'warn',
  TRIALING: 'warn',
  PAST_DUE: 'warn',
  ON_HOLD: 'warn',
  FROZEN: 'warn',

  REJECTED: 'danger',
  SUSPENDED: 'danger',
  FAILED: 'danger',
  OVERDUE: 'danger',
  BLOCKED: 'danger',
  BANNED: 'danger',
  URGENT: 'danger',
  ABSENT: 'danger',

  PROCESSING: 'info',
  SUBMITTED: 'info',
  IN_REVIEW: 'info',
  IN_PROGRESS: 'info',
  OPEN: 'info',
  SCHEDULED: 'info',
  INVITED: 'info',
  REFUNDED: 'info',

  DRAFT: 'neutral',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
  CANCELED: 'neutral',
  CLOSED: 'neutral',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
  WITHDRAWN: 'neutral',
};

// Pale fill + dark text in light mode, translucent fill + light text in dark
// mode. Hex values on purpose: inside .dash the stock green/red/amber names are
// remapped to theme tokens. Every pair clears 4.5:1 on its own fill.
const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-[#edf3ec] text-[#346538] dark:bg-[#34d399]/15 dark:text-[#6ee7b7]',
  warn: 'bg-[#fbf3db] text-[#8a5d00] dark:bg-[#fbbf24]/15 dark:text-[#fcd34d]',
  danger: 'bg-[#fdebec] text-[#9f2f2d] dark:bg-[#f87171]/15 dark:text-[#fca5a5]',
  info: 'bg-[#e1f3fe] text-[#1f6c9f] dark:bg-[#60a5fa]/15 dark:text-[#93c5fd]',
  neutral: 'bg-[#f1f1ef] text-[#5b6270] dark:bg-white/10 dark:text-[#d4d4d8]',
};

type Props = {
  status: string;
  /** Overrides the text; the tone still comes from `status`. */
  label?: string;
  /** For values outside the shared map, e.g. roles. */
  tone?: Tone;
  className?: string;
};

export default function StatusBadge({ status, label, tone, className = '' }: Props) {
  const key = status.toUpperCase();
  const resolved = tone ?? STATUS_TONES[key] ?? 'neutral';
  const text = label ?? key.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[resolved]} ${className}`}>
      {text}
    </span>
  );
}
