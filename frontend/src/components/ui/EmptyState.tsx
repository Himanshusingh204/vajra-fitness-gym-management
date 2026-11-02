import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, hint, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-gray-300 dark:text-gray-600">{icon}</div>}
      <p className="font-bold text-[var(--color-charcoal)] dark:text-white">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-500">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-2 px-4 py-2 text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
