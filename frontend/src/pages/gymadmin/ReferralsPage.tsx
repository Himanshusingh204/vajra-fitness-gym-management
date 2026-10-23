import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { getReferrals, createReferral, updateReferralStatus, getReferralStats } from '../../api/referral.api';
import { useGym } from './GymContext';

export default function ReferralsPage() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals', branch?.id],
    queryFn: () => getReferrals(branch?.id),
    enabled: !!branch?.id,
  });
  const { data: referralStats } = useQuery({
    queryKey: ['referralStats', branch?.id],
    queryFn: () => getReferralStats(branch?.id),
    enabled: !!branch?.id,
  });
  const [referralForm, setReferralForm] = useState({ userId: '', referredUserId: '', rewardType: 'CREDIT', rewardValue: 0 });
  const createReferralMut = useMutation({
    mutationFn: (data: typeof referralForm) => createReferral(branch?.id, { ...data, rewardValue: Number(data.rewardValue) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referrals', branch?.id] }); qc.invalidateQueries({ queryKey: ['referralStats', branch?.id] }); setReferralForm({ userId: '', referredUserId: '', rewardType: 'CREDIT', rewardValue: 0 }); },
  });
  const updateReferralStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateReferralStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referrals', branch?.id] }); qc.invalidateQueries({ queryKey: ['referralStats', branch?.id] }); },
  });

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-card border border-line p-8">
        <h2 className="font-bold text-lg mb-4">Referral program</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total referrals</p>
            <p className="text-2xl font-extrabold text-accent-ink">{referralStats?.totalReferrals || 0}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Pending</p>
            <p className="text-2xl font-extrabold text-warning-ink">{referralStats?.pendingReferrals || 0}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Completed</p>
            <p className="text-2xl font-extrabold text-success-ink">{referralStats?.completedReferrals || 0}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total rewards</p>
            <p className="text-2xl font-extrabold text-info-ink">₹{(referralStats?.totalRewardValue || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createReferralMut.mutate(referralForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <input className="input-field" placeholder="Referrer User ID" value={referralForm.userId} onChange={(e) => setReferralForm((p) => ({ ...p, userId: e.target.value }))} required />
          <input className="input-field" placeholder="Referred User ID" value={referralForm.referredUserId} onChange={(e) => setReferralForm((p) => ({ ...p, referredUserId: e.target.value }))} required />
          <select className="input-field" value={referralForm.rewardType} onChange={(e) => setReferralForm((p) => ({ ...p, rewardType: e.target.value }))}>
            <option value="CREDIT">Credit</option>
            <option value="DISCOUNT">Discount</option>
            <option value="FREE_MONTH">Free month</option>
          </select>
          <input className="input-field" type="number" placeholder="Reward value" value={referralForm.rewardValue || ''} onChange={(e) => setReferralForm((p) => ({ ...p, rewardValue: Number(e.target.value) }))} required />
          <button type="submit" disabled={createReferralMut.isPending} className="btn-primary py-2">{createReferralMut.isPending ? 'Creating…' : 'Create Referral'}</button>
        </form>
        {referralsLoading ? (
          <div className="h-32 bg-surface-sunken rounded-control animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Code', 'Reward Type', 'Value', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {referrals.map((ref: any) => (
                  <tr key={ref.id} className="hover:bg-surface-sunken">
                    <td className="px-6 py-3 font-mono text-sm">{ref.referralCode}</td>
                    <td className="px-6 py-3 text-ink-muted">{ref.rewardType}</td>
                    <td className="px-6 py-3 font-semibold">₹{ref.rewardValue.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${ref.status === 'COMPLETED' ? 'bg-success-soft text-success-ink' : ref.status === 'PENDING' ? 'bg-warning-soft text-warning-ink' : 'bg-surface-sunken text-ink-muted'}`}>{ref.status}</span></td>
                    <td className="px-6 py-3 text-ink-muted">{new Date(ref.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-3">
                      {ref.status !== 'COMPLETED' && (
                        <button onClick={() => updateReferralStatusMut.mutate({ id: ref.id, status: 'COMPLETED' })} className="text-success-ink hover:text-success-ink" aria-label={`Mark referral ${ref.referralCode} as completed`}><CheckCircle className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
