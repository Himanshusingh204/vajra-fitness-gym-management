import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './cx';

export type ToastType = 'success' | 'error' | 'info';

const STYLE = {
  success: ['border-success/40', 'text-success-ink', CheckCircle2],
  error: ['border-danger/40', 'text-danger-ink', AlertCircle],
  info: ['border-info/40', 'text-info-ink', Info],
} as const;

export function Toast({ type, message, onDismiss }: { type: ToastType; message: string; onDismiss: () => void }) {
  const [border, ink, Icon] = STYLE[type];
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cx('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-surface-raised py-2 pl-4 pr-1 text-ink shadow-overlay animate-[fade-in_0.2s_ease]', border)}
    >
      <Icon className={cx('mt-2.5 size-5 shrink-0', ink)} aria-hidden="true" />
      <p className="flex-1 py-2.5 text-sm font-medium">{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
