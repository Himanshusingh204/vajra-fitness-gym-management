import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

type CardProps = ComponentProps<'div'> & {
  /** Drop the default padding, e.g. when a DataTable fills the card. */
  flush?: boolean;
};

export function Card({ flush = false, className, ...props }: CardProps) {
  return <div className={cx('rounded-card border border-line bg-surface', !flush && 'p-5 sm:p-6', className)} {...props} />;
}

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function StatTile({ label, value, hint, icon: Icon, className }: StatTileProps) {
  return (
    <Card className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {Icon && <Icon className="size-4 text-ink-muted" aria-hidden="true" />}
      </div>
      <p className="text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </Card>
  );
}
