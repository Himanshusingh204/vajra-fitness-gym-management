import { cx } from './cx';

/** Size it with className (h-4 w-32, h-24 w-full ...) to match the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-control bg-surface-sunken', className)} />;
}
