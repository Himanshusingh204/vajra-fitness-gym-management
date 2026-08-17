import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Accessible replacement for window.confirm() and ad-hoc plain-div dialogs:
// role="dialog" + aria-modal, Escape to close, backdrop click to close,
// focus moved to the dialog on open and returned to the trigger on close.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-sm rounded-2xl p-6 shadow-2xl outline-none"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <span className="mt-0.5 shrink-0 rounded-full bg-red-500/10 p-2" aria-hidden="true">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-[var(--color-deepgray)] dark:text-white">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-1 text-sm text-[var(--color-muted)] break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--color-deepgray)] dark:text-white hover:bg-[var(--color-border)]/40 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
              destructive
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-[var(--color-primary)] hover:opacity-90 focus-visible:ring-[var(--color-primary)]'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
