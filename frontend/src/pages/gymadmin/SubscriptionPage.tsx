import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Diamond } from 'lucide-react';
import { StatusBadge } from '../../components/ui';
import { getMyGymSubscription, getInvoices } from '../../api/saas.api';

export default function SubscriptionPage() {
  const [now] = useState(() => Date.now());
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-gym-subscription'],
    queryFn: getMyGymSubscription,
  });
  const { data: subscriptionInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['my-saas-invoices'],
    queryFn: getInvoices,
  });

  return (
    <div className="space-y-6">
      {subscriptionLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-sunken rounded-card animate-pulse" />)}
        </div>
      ) : !subscription?.hasSubscription ? (
        <div className="bg-surface rounded-card border border-dashed border-line p-10 text-center">
          <Diamond className="w-10 h-10 text-accent-ink mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">No active platform subscription</h3>
          <p className="text-sm text-ink-muted mb-6 max-w-md mx-auto">
            Subscribe to a Vajra Fitness plan to unlock member limits, trainer seats and platform features for your gym.
          </p>
          <Link to="/subscription" className="btn-primary inline-flex px-6">View plans</Link>
        </div>
      ) : (
        <>
          {(() => {
            const daysLeft = subscription.endDate
              ? Math.ceil((new Date(subscription.endDate).getTime() - now) / (24 * 60 * 60 * 1000))
              : null;
            return (
              <div className="bg-surface rounded-card border border-line p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-ink">{subscription.plan?.name || 'Current Plan'}</h3>
                      <StatusBadge status={subscription.status} />
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString('en-IN') : '-'} → {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-IN') : '-'}
                      {daysLeft != null && daysLeft >= 0 && <span> · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>}
                    </p>
                  </div>
                  <Link to="/subscription" className="btn-outline px-5">Change plan</Link>
                </div>
                {subscription.isReadonly && (
                  <div className="mt-4 p-3 rounded-control bg-danger-soft text-sm text-danger-ink">
                    Your subscription has lapsed, so the dashboard is read-only. Renew your plan to get full access back.
                  </div>
                )}
                {subscription.features.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {subscription.features.map((f) => (
                      <span key={f} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent-ink">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="bg-surface rounded-card border border-line p-6">
            <h3 className="font-bold text-ink mb-4">Plan usage and limits</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ['Members', subscription.usage.members, subscription.limits.maxMembers],
                ['Trainers', subscription.usage.trainers, subscription.limits.maxTrainers],
                ['Staff', subscription.usage.staff, subscription.limits.maxStaff],
                ['Branches', subscription.usage.branches, subscription.limits.maxBranches],
                ['Classes', subscription.usage.classes, subscription.limits.maxClasses],
              ] as [string, number, number | null][]).map(([label, used, limit]) => {
                const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-semibold text-ink">{label}</span>
                      <span className="text-xs text-ink-muted">{used} / {limit ?? 'Unlimited'}</span>
                    </div>
                    {limit != null && (
                      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-accent'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-card border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="font-bold text-lg">Billing History ({subscriptionInvoices.length})</h2>
            </div>
            {invoicesLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : subscriptionInvoices.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">No invoices generated yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken">
                    <tr>
                      {['Invoice #', 'Plan', 'Period', 'Total', 'Status', 'Issued'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {subscriptionInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-sunken">
                        <td className="px-6 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3 text-ink-muted">{inv.planName}</td>
                        <td className="px-6 py-3 text-ink-muted">{inv.billingPeriod}</td>
                        <td className="px-6 py-3 font-semibold">₹{inv.total.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${inv.status === 'PAID' ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'}`}>{inv.status}</span>
                        </td>
                        <td className="px-6 py-3 text-ink-muted">{new Date(inv.issueDate).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
