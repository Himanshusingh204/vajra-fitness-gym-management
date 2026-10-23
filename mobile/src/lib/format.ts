import type { Tone } from '../theme';

type FeeLike = { status: string; dueDate: string };

const DAY = 24 * 60 * 60 * 1000;

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(value: string | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

// Money arrives as a Decimal string ("1499.00") or a number. Rupees are shown
// without paise unless there are some.
export function formatMoney(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  const text = n.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `₹${text}`;
}

// Whole calendar days from today to the given date (negative when past).
export function daysUntil(value: string | Date, now: Date = new Date()): number {
  const target = new Date(value);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / DAY);
}

export function daysLeftLabel(days: number): string {
  if (days < 0) return days === -1 ? 'Ended yesterday' : `Ended ${-days} days ago`;
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

// The unpaid fee due soonest. Overdue fees count, since those need paying first.
export function nextDueFee<T extends FeeLike>(fees: T[] | undefined): T | undefined {
  return (fees ?? [])
    .filter((f) => f.status !== 'PAID')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

export function isOverdue(fee: FeeLike, now: Date = new Date()): boolean {
  return fee.status === 'OVERDUE' || (fee.status !== 'PAID' && daysUntil(fee.dueDate, now) < 0);
}

// YYYY-MM-DD in local time, the format the attendance API filters on.
export function localDateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function statusTone(status: string | null | undefined): Tone {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PRESENT':
    case 'CONVERTED':
      return 'success';
    case 'PENDING':
    case 'PARTIAL':
    case 'FROZEN':
    case 'NEW':
      return 'warning';
    case 'OVERDUE':
    case 'EXPIRED':
    case 'SUSPENDED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'LOST':
      return 'danger';
    default:
      return 'neutral';
  }
}

export type ExerciseItem = { exercise: string; sets?: string; reps?: string; notes?: string };

// Same rules as the web ExercisePlan: a JSON array from the editor, or legacy
// free text with one exercise per line or comma.
export function parseExercises(raw: string | null | undefined): ExerciseItem[] {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') return { exercise: item };
          const o = (item ?? {}) as Record<string, unknown>;
          const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
          return { exercise: str(o.exercise), sets: str(o.sets), reps: str(o.reps), notes: str(o.notes) };
        })
        .filter((i) => i.exercise);
    }
  } catch {
    // not JSON, fall through
  }
  return trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((exercise) => ({ exercise }));
}
