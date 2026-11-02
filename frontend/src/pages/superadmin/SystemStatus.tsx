import { useQuery } from '@tanstack/react-query';
import { ServerCrash } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';

type Health = { status: string; timestamp: string; version: string; dependencies: { database: string; cache: string } };

const LABELS: Record<string, [string, string]> = {
  OK: ['Up', 'text-green-600'],
  up: ['Up', 'text-green-600'],
  DEGRADED: ['Degraded', 'text-red-600'],
  down: ['Down', 'text-red-600'],
  memory: ['In memory, no Redis', 'text-amber-500'],
};

export default function SystemStatus() {
  const { data, isLoading, isError } = useQuery<Health>({
    queryKey: ['admin-health'],
    // 503 still carries the body that says which dependency is down.
    queryFn: () => api.get('/health', { validateStatus: (s) => s === 200 || s === 503 }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const rows = data
    ? [['API', data.status], ['Database', data.dependencies.database], ['Cache', data.dependencies.cache]]
    : [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <h2 className="text-lg font-bold text-[var(--color-deepgray)] dark:text-white">System status</h2>
        {data && (
          <span className="text-xs text-gray-500">
            v{data.version} · checked {new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-4 p-6 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />)}
        </div>
      ) : isError || !data ? (
        <EmptyState icon={<ServerCrash className="h-8 w-8" />} title="The API did not answer" hint="The health check failed to reach the server. Check the backend logs." />
      ) : (
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {rows.map(([name, value]) => {
            const [label, tone] = LABELS[value] ?? [value, 'text-[var(--color-charcoal)]'];
            return (
              <div key={name} className="rounded-lg border border-[var(--color-border)] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">{name}</p>
                <p className={`text-lg font-extrabold ${tone}`}>{label}</p>
              </div>
            );
          })}
        </div>
      )}
      <p className="border-t border-[var(--color-border)] px-6 py-3 text-xs text-gray-500">
        Background jobs and the last backup will show here once the job table exists.
      </p>
    </div>
  );
}
