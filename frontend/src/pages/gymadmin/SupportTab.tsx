import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { LifeBuoy } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';

type Ticket = { id: string; subject: string; message: string; status: string; priority: string; createdAt: string };

// Tickets are raised from the Help Center form; this lists the owner's own.
export default function SupportTab() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => api.get('/support/my').then((r) => r.data as Ticket[]),
  });

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <h2 className="text-lg font-bold dark:text-white">Support tickets</h2>
        <Link to="/help" className="btn-primary px-4 py-2 text-sm">Raise a ticket</Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-6" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />)}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="h-8 w-8" />} title="No tickets yet" hint="Questions about billing, your account or a bug go to the Kavach team. You can follow their status here." />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {tickets.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold dark:text-white">{t.subject}</p>
                <p className="line-clamp-2 text-sm text-gray-500">{t.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-600 dark:bg-white/10">{t.status.replace('_', ' ')}</span>
                <time className="text-gray-500" dateTime={t.createdAt}>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
