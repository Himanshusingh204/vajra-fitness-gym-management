import { useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';

export type WizardStep = { id: string; label: string };

type Props = {
  steps: WizardStep[];
  /** Index of the step on screen. */
  current: number;
  /** Lets the user jump back to an earlier step from the rail. */
  onStepClick?: (index: number) => void;
  onBack?: () => void;
  /** Called only after `validate` passes. */
  onNext: () => void;
  /** Runs before moving on; return false to stay (show the errors yourself). */
  validate?: () => boolean | Promise<boolean>;
  onSaveDraft?: () => void;
  nextLabel?: string;
  /** Disables the buttons while a save or submit is in flight. */
  busy?: boolean;
  saving?: boolean;
  savedAt?: Date | number | null;
  saveError?: string | null;
  children: ReactNode;
};

const ago = (then: number, now: number) => {
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours} h ago` : new Date(then).toLocaleDateString('en-IN');
};

function SaveStatus({ saving, savedAt, saveError }: Pick<Props, 'saving' | 'savedAt' | 'saveError'>) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [savedAt]);

  let text = '';
  if (saving) text = 'Saving…';
  else if (saveError) text = saveError;
  else if (savedAt) text = `Saved · ${ago(new Date(savedAt).getTime(), Math.max(now, new Date(savedAt).getTime()))}`;

  return (
    <p aria-live="polite" className={`text-xs ${saveError ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`}>
      {text}
    </p>
  );
}

export default function Wizard({
  steps, current, onStepClick, onBack, onNext, validate, onSaveDraft, nextLabel,
  busy, saving, savedAt, saveError, children,
}: Props) {
  const [checking, setChecking] = useState(false);
  const isLast = current === steps.length - 1;
  const step = steps[current];

  const next = async () => {
    if (validate) {
      setChecking(true);
      try {
        if (!(await validate())) return;
      } finally {
        setChecking(false);
      }
    }
    onNext();
  };

  const locked = busy || checking;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Progress">
        <div className="sm:hidden">
          <p className="text-xs font-semibold text-[var(--color-muted)]">
            Step {current + 1} of {steps.length}
          </p>
          <p className="font-bold text-[var(--color-deepgray)]">{step?.label}</p>
          <div className="mt-2 h-1 rounded-full bg-[var(--color-border)]">
            <div className="h-1 rounded-full bg-[var(--color-primary)]" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <ol className="hidden items-center gap-2 sm:flex">
          {steps.map((s, i) => {
            const done = i < current;
            const canJump = done && !!onStepClick && !locked;
            const content = (
              <>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    i === current
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white dark:text-[var(--color-base)]'
                      : done
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border-strong)] text-[var(--color-muted)]'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className={`sr-only text-sm lg:not-sr-only lg:truncate ${i === current ? 'font-bold text-[var(--color-deepgray)]' : 'text-[var(--color-muted)]'}`}>
                  {s.label}
                </span>
                {done && <span className="sr-only">(done)</span>}
              </>
            );
            return (
              <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2" aria-current={i === current ? 'step' : undefined}>
                {canJump ? (
                  <button type="button" onClick={() => onStepClick(i)} title={s.label} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg hover:opacity-80">
                    {content}
                  </button>
                ) : (
                  <span title={s.label} className="flex min-h-11 min-w-0 items-center gap-2">
                    {content}
                  </span>
                )}
                {i < steps.length - 1 && <span className="h-px min-w-3 flex-1 bg-[var(--color-border-strong)]" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div>{children}</div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:bg-transparent sm:px-0">
        {current > 0 && onBack && (
          <button type="button" onClick={onBack} disabled={locked} className="btn-ghost min-h-11">
            Back
          </button>
        )}
        <div className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          <SaveStatus saving={saving} savedAt={savedAt} saveError={saveError} />
        </div>
        {onSaveDraft && (
          <button type="button" onClick={onSaveDraft} disabled={locked || saving} className="btn-outline min-h-11 max-sm:ml-auto">
            Save draft
          </button>
        )}
        <button type="button" onClick={next} disabled={locked} className={`btn-primary min-h-11 ${onSaveDraft ? '' : 'max-sm:ml-auto'}`}>
          {checking ? 'Checking…' : nextLabel ?? (isLast ? 'Submit' : 'Next')}
        </button>
      </div>
    </div>
  );
}
