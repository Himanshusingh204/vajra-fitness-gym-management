import { createContext, useContext, useId, useState, type ComponentProps, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cx } from './cx';

type FieldState = { id: string; describedBy?: string; invalid: boolean; required: boolean };

const FieldContext = createContext<FieldState | null>(null);

type FieldProps = {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Defaults to a generated id; pass one when a label elsewhere must point at the control. */
  id?: string;
  className?: string;
};

/** Label above, control, then hint and error below. The control inside picks up id and aria wiring. */
export function Field({ label, children, hint, error, required = false, id, className }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider value={{ id: fieldId, describedBy, invalid: Boolean(error), required }}>
      <div className={cx('flex flex-col gap-1.5', className)}>
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger-ink" aria-hidden="true"> *</span>}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-sm text-ink-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm font-medium text-danger-ink">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps<T extends { id?: string; required?: boolean }>(props: T) {
  const field = useContext(FieldContext);
  if (!field) return props;
  return {
    id: field.id,
    required: field.required || undefined,
    'aria-describedby': field.describedBy,
    'aria-invalid': field.invalid || undefined,
    ...props,
  };
}

const control =
  'min-h-11 w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink transition-colors duration-150 placeholder:text-ink-muted focus:border-accent-ink disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70 aria-[invalid=true]:border-danger sm:text-sm';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(control, className)} {...useFieldProps(props)} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={cx(control, 'resize-y', className)} {...useFieldProps(props)} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    // input-field brings the themed chevron for selects
    <select className={cx('input-field', control, 'pr-10', className)} {...useFieldProps(props)}>
      {children}
    </select>
  );
}

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={cx(control, 'pr-12', className)} {...useFieldProps(props)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center rounded-r-control text-ink-muted hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

export function Checkbox({ label, hint, error, id, className, ...props }: CheckboxProps) {
  const generated = useId();
  const boxId = id ?? generated;
  const hintId = hint ? `${boxId}-hint` : undefined;
  const errorId = error ? `${boxId}-error` : undefined;

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={boxId} className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          id={boxId}
          type="checkbox"
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
          className="size-5 shrink-0 cursor-pointer rounded-[5px] border-line-strong accent-accent"
          {...props}
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="pl-8 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="pl-8 text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
