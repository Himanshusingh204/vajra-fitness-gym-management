import { useState } from 'react';
import { Button, Dialog, Field, Input, Select } from '../../components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { getGymMemberships, createMembership, renewMembership } from '../../api/booking.api';
import { useGym } from './GymContext';
import type { Member, Plan } from './types';

export default function MembershipsPanel() {
  const { gym: branch, branchFilter } = useGym();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans', branch?.id],
    queryFn: () => api.get(`/plans/admin/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['gymMemberships', branch?.id],
    queryFn: () => getGymMemberships(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 20000,
  });

  const [membershipForm, setMembershipForm] = useState({ memberId: '', planId: '', startDate: '', discount: 0, paymentStatus: 'PENDING', paymentMethod: '', transactionId: '', notes: '' });
  const createMembershipMut = useMutation({
    mutationFn: (data: typeof membershipForm) => createMembership(branch?.id, { ...data, planId: data.planId || undefined, discount: Number(data.discount), startDate: data.startDate || undefined, paymentMethod: data.paymentMethod || undefined, transactionId: data.transactionId || undefined, notes: data.notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setMembershipForm({ memberId: '', planId: '', startDate: '', discount: 0, paymentStatus: 'PENDING', paymentMethod: '', transactionId: '', notes: '' });
    },
  });
  const renewMembershipMut = useMutation({
    mutationFn: ({ membershipId, planId, discount, paymentStatus }: { membershipId: string; planId?: string; discount: number; paymentStatus: string }) =>
      renewMembership(branch?.id, { membershipId, planId: planId || undefined, discount: Number(discount), paymentStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });
  const [renewTarget, setRenewTarget] = useState<any>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewDiscount, setRenewDiscount] = useState(0);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Create membership</h3>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (membershipForm.memberId) createMembershipMut.mutate(membershipForm); }}
          >
            <div>
              <label htmlFor="membershipspanel-f1" className="block text-sm font-semibold text-ink mb-1.5">Member</label>
              <select id="membershipspanel-f1" className="input-field" value={membershipForm.memberId} onChange={(e) => setMembershipForm({ ...membershipForm, memberId: e.target.value })} required>
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="membershipspanel-f2" className="block text-sm font-semibold text-ink mb-1.5">Plan</label>
                <select id="membershipspanel-f2" className="input-field" value={membershipForm.planId} onChange={(e) => setMembershipForm({ ...membershipForm, planId: e.target.value })}>
                  <option value="">Select plan…</option>
                  {plans.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ₹{p.price.toLocaleString('en-IN')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="membershipspanel-f3" className="block text-sm font-semibold text-ink mb-1.5">Start date</label>
                <input id="membershipspanel-f3" className="input-field" type="date" value={membershipForm.startDate} onChange={(e) => setMembershipForm({ ...membershipForm, startDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="membershipspanel-f4" className="block text-sm font-semibold text-ink mb-1.5">Discount (₹)</label>
                <input id="membershipspanel-f4" className="input-field" type="number" min={0} value={membershipForm.discount} onChange={(e) => setMembershipForm({ ...membershipForm, discount: Number(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="membershipspanel-f5" className="block text-sm font-semibold text-ink mb-1.5">Payment status</label>
                <select id="membershipspanel-f5" className="input-field" value={membershipForm.paymentStatus} onChange={(e) => setMembershipForm({ ...membershipForm, paymentStatus: e.target.value })}>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="membershipspanel-f6" className="block text-sm font-semibold text-ink mb-1.5">Payment method</label>
                <select id="membershipspanel-f6" className="input-field" value={membershipForm.paymentMethod} onChange={(e) => setMembershipForm({ ...membershipForm, paymentMethod: e.target.value })}>
                  <option value="">None</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
                <p className="text-xs text-ink-muted mt-1.5">Record offline payments here - members can also pay pending fees online via Razorpay.</p>
              </div>
              <div>
                <label htmlFor="membershipspanel-f7" className="block text-sm font-semibold text-ink mb-1.5">Transaction ID</label>
                <input id="membershipspanel-f7" className="input-field" value={membershipForm.transactionId} onChange={(e) => setMembershipForm({ ...membershipForm, transactionId: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="membershipspanel-f8" className="block text-sm font-semibold text-ink mb-1.5">Notes</label>
              <input id="membershipspanel-f8" className="input-field" value={membershipForm.notes} onChange={(e) => setMembershipForm({ ...membershipForm, notes: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary justify-center" disabled={createMembershipMut.isPending || !branch?.id}>
              <Plus className="w-4 h-4" /> Create Membership
            </button>
            <div aria-live="polite">
              {createMembershipMut.isSuccess && <p className="text-success-ink text-sm">Membership created and member activated.</p>}
              {createMembershipMut.isError && <p className="text-danger-ink text-sm">{(createMembershipMut.error as any)?.response?.data?.error || 'Failed to create membership.'}</p>}
            </div>
          </form>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h2 className="font-bold text-lg">Memberships ({memberships.length})</h2>
          </div>
          {membershipsLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : memberships.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">No memberships yet.</div>
          ) : (
            <div className="divide-y divide-line max-h-[600px] overflow-y-auto">
              {memberships.map((m: any) => (
                <div key={m.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{m.member?.user?.username || '-'}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {m.plan?.name || 'Custom'} · {new Date(m.startDate).toLocaleDateString('en-IN')} → {new Date(m.endDate).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">₹{m.finalAmount.toLocaleString('en-IN')} · {m.paymentStatus}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-control text-xs font-bold uppercase ${
                        m.lifecycleStatus === 'ACTIVE' ? 'bg-success-soft text-success-ink' :
                        m.lifecycleStatus === 'EXPIRING_SOON' ? 'bg-warning-soft text-warning-ink' :
                        m.lifecycleStatus === 'EXPIRED' ? 'bg-danger-soft text-danger-ink' :
                        m.lifecycleStatus === 'PENDING' ? 'bg-warning-soft text-warning-ink' :
                        'bg-surface-sunken text-ink-muted'
                      }`}>{m.lifecycleStatus}</span>
                      {m.isRenewal && <div><span className="text-[10px] font-bold text-info-ink">RENEWAL</span></div>}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => { setRenewTarget(m); setRenewPlanId(m.planId || ''); setRenewDiscount(0); }}
                      className="text-xs font-bold text-accent-ink hover:underline"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        title="Renew membership"
        description={renewTarget ? `${renewTarget.member?.user?.username} - ${renewTarget.plan?.name || 'Custom'}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewTarget(null)}>Cancel</Button>
            <Button
              loading={renewMembershipMut.isPending}
              onClick={() => {
                if (!renewTarget) return;
                renewMembershipMut.mutate({ membershipId: renewTarget.id, planId: renewPlanId, discount: renewDiscount, paymentStatus: 'PENDING' });
                setRenewTarget(null);
              }}
            >
              Confirm renewal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Plan">
            <Select value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)}>
              <option value="">Keep current plan</option>
              {plans.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name} - ₹{p.price.toLocaleString('en-IN')}</option>
              ))}
            </Select>
          </Field>
          <Field label="Discount (₹)">
            <Input type="number" min={0} value={renewDiscount} onChange={(e) => setRenewDiscount(Number(e.target.value))} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
