import type { ReactNode } from 'react';
import { Card } from '../../components/ui';

type PanelProps = { title: string; action?: ReactNode; children: ReactNode };

export function Panel({ title, action, children }: PanelProps) {
  return (
    <Card flush className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
