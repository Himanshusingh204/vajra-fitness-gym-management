export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="w-10 h-10 rounded-full border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] animate-spin" role="status" aria-label="Loading" />
      <span className="text-sm font-semibold text-[var(--color-muted)]">Loading…</span>
    </div>
  );
}
