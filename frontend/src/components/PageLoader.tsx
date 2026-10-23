export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent-ink" aria-hidden="true" />
      <span className="text-sm font-medium text-ink-muted">Loading</span>
    </div>
  );
}
