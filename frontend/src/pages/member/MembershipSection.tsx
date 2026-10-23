import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { getMyMemberships } from '../../api/membership.api';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { formatPrice } from '../../utils/format';

export default function MembershipSection() {
  const { data: memberships, isLoading } = useQuery({ queryKey: ['myMemberships'], queryFn: getMyMemberships, refetchInterval: 30000 });

  return (
    <>
      <PageHeader title="Membership" description="Your plans, dates and payment status." />
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !memberships || memberships.length === 0 ? (
        <Card><EmptyState icon={Building2} title="No membership records yet" /></Card>
      ) : (
        <ul className="space-y-4">
          {memberships.map((m: any) => (
            <li key={m.id}>
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{m.plan?.name || 'Membership'}</h2>
                      {m.isRenewal && <StatusBadge status="RENEWAL" label="Renewal" tone="info" />}
                      <StatusBadge status={m.lifecycleStatus} />
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">
                      {new Date(m.startDate).toLocaleDateString('en-IN')} to {new Date(m.endDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl font-bold text-ink">{formatPrice(m.finalAmount)}</p>
                    {m.discount > 0 && (
                      <p className="text-sm text-ink-muted">Original {formatPrice(m.originalAmount)}, discount {formatPrice(m.discount)}</p>
                    )}
                    <div className="mt-1"><StatusBadge status={m.paymentStatus} /></div>
                  </div>
                </div>
                {(m.paymentMethod || m.transactionId) && (
                  <p className="mt-4 rounded-control bg-surface-sunken p-3 text-sm text-ink-muted">
                    {m.paymentMethod && <span className="mr-4">Method: <b className="text-ink">{m.paymentMethod}</b></span>}
                    {m.transactionId && <span>Transaction: <b className="font-mono text-ink">{m.transactionId}</b></span>}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
