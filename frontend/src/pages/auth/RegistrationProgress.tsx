const STEPS = [
  { id: 1, label: 'Choose account' },
  { id: 2, label: 'Your details' },
] as const;

export default function RegistrationProgress({ current }: { current: 1 | 2 }) {
  return (
    <nav aria-label="Registration progress" className="mb-6">
      <ol className="grid grid-cols-2 gap-3">
        {STEPS.map((step) => {
          const complete = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} aria-current={active ? 'step' : undefined} className="flex min-w-0 items-center gap-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete || active ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border-strong)] text-[var(--color-muted)]'}`}>
                {step.id}
              </span>
              <span className={`truncate text-xs font-semibold sm:text-sm ${active ? 'text-[var(--color-deepgray)]' : 'text-[var(--color-muted)]'}`}>{step.label}</span>
              {step.id === 1 && <span className={`h-px flex-1 ${current > step.id ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
