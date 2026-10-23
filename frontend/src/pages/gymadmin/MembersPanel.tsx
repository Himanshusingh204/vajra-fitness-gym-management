import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import BranchFilter from './BranchFilter';
import { useGym } from './GymContext';
import type { Member, Plan } from './types';

export default function MembersPanel() {
  const { gym: branch, approvedBranches, confirm: setConfirmAction, branchFilter } = useGym();
  const qc = useQueryClient();
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
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

  const [memberSearch, setMemberSearch] = useState('');

  const updateMemberStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/members/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
    },
  });
  const deleteMember = useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gymMemberships', branch?.id] });
      qc.invalidateQueries({ queryKey: ['fees', branch?.id] });
    },
  });
  const [addMemberForm, setAddMemberForm] = useState({ username: '', email: '', phone: '', planId: '', status: 'PENDING', branchId: '' });
  const addMember = useMutation({
    mutationFn: (data: typeof addMemberForm) => api.post(`/members/gym/${branch?.id}`, {
      username: data.username,
      email: data.email,
      phone: data.phone || undefined,
      planId: data.planId || undefined,
      status: data.status,
      branchId: data.branchId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setAddMemberForm({ username: '', email: '', phone: '', planId: '', status: 'PENDING', branchId: '' });
    },
  });

  const assignMemberBranch = useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) => api.put(`/members/${id}`, { branchId: branchId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', branch?.id] });
      qc.invalidateQueries({ queryKey: ['branches', branch?.id] });
    },
  });

  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'PENDING').length, [members]);
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.user?.username || '').toLowerCase().includes(q) || (m.user?.email || '').toLowerCase().includes(q));
  }, [members, memberSearch]);

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="font-bold text-lg">Members ({members.length})</h2>
          <div className="flex items-center gap-3">
            <input
              className="input-field sm:w-64 text-sm"
              placeholder="Search by name or email…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            <BranchFilter />
            <span className="text-xs font-semibold text-warning-ink">{pendingMembers} pending approval</span>
          </div>
        </div>
        {membersLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Name', 'Email', 'Plan', 'Branch', 'Joined', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredMembers.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-ink-muted">{memberSearch ? 'No members match your search.' : 'No members yet.'}</td></tr>
                ) : filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-sunken">
                    <td className="px-6 py-4 font-semibold">{m.user?.username}</td>
                    <td className="px-6 py-4 text-ink-muted">{m.user?.email}</td>
                    <td className="px-6 py-4 text-ink-muted">{m.membershipPlan?.name || '-'}</td>
                    <td className="px-6 py-4">
                      {approvedBranches.length > 0 ? (
                        <select
                          className="text-sm border border-line rounded-control px-2 py-1 bg-transparent text-ink-muted"
                          value={m.branch?.id || ''}
                          onChange={(e) => assignMemberBranch.mutate({ id: m.id, branchId: e.target.value })}
                        >
                          <option value="">-</option>
                          {approvedBranches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink-muted">{new Date(m.joiningDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        m.status === 'ACTIVE' ? 'bg-success-soft text-success-ink' :
                        m.status === 'PENDING' ? 'bg-warning-soft text-warning-ink' :
                        'bg-surface-sunken text-ink-muted'
                      }`}>{m.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {m.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateMemberStatus.mutate({ id: m.id, status: 'ACTIVE' })}
                            className="inline-flex items-center gap-1 text-success-ink hover:text-success-ink font-semibold text-sm hover:underline"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateMemberStatus.mutate({ id: m.id, status: 'INACTIVE' })}
                            className="inline-flex items-center gap-1 text-danger-ink hover:text-danger-ink font-semibold text-sm hover:underline"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => setConfirmAction({
                              title: 'Delete member',
                              message: `Permanently delete member ${m.user?.username}? This removes their fees, memberships, attendance and bookings.`,
                              onConfirm: () => { deleteMember.mutate(m.id); setConfirmAction(null); },
                            })}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-danger-ink font-semibold text-sm"
                            title="Delete member permanently"
                            aria-label={`Delete member ${m.user?.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateMemberStatus.mutate({ id: m.id, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                            className="text-sm font-semibold text-ink-muted hover:text-accent-ink hover:underline"
                          >
                            {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setConfirmAction({
                              title: 'Delete member',
                              message: `Permanently delete member ${m.user?.username}? This removes their fees, memberships, attendance and bookings.`,
                              onConfirm: () => { deleteMember.mutate(m.id); setConfirmAction(null); },
                            })}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-danger-ink font-semibold text-sm"
                            title="Delete member permanently"
                            aria-label={`Delete member ${m.user?.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-card border border-line p-6 max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Add a member</h3>
        <form
          className="grid sm:grid-cols-2 gap-4"
          onSubmit={(e) => { e.preventDefault(); addMember.mutate(addMemberForm); }}
        >
          <input className="input-field" placeholder="Full name" value={addMemberForm.username} onChange={(e) => setAddMemberForm({ ...addMemberForm, username: e.target.value })} required />
          <input className="input-field" type="email" placeholder="Email" value={addMemberForm.email} onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })} required />
          <input className="input-field" placeholder="Phone" value={addMemberForm.phone} onChange={(e) => setAddMemberForm({ ...addMemberForm, phone: e.target.value })} />
          <select className="input-field" value={addMemberForm.planId} onChange={(e) => setAddMemberForm({ ...addMemberForm, planId: e.target.value })}>
            <option value="">No plan</option>
            {plans.filter((p) => p.isActive).map((p) => (
              <option key={p.id} value={p.id}>{p.name} - ₹{p.price.toLocaleString('en-IN')}</option>
            ))}
          </select>
          {approvedBranches.length > 0 && (
            <select className="input-field" value={addMemberForm.branchId} onChange={(e) => setAddMemberForm({ ...addMemberForm, branchId: e.target.value })}>
              <option value="">No branch</option>
              {approvedBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="btn-primary justify-center sm:col-span-2" disabled={addMember.isPending || !branch?.id}>
            <Plus className="w-4 h-4" /> Add Member
          </button>
          {addMember.isSuccess && (
            <div className="sm:col-span-2 text-sm space-y-1.5" aria-live="polite">
              <p className="text-success-ink">Member added. Share the activation link to let them set their password:</p>
              {addMember.data?.data?.activationLink && (
                <p className="text-accent-ink font-mono text-xs break-all bg-surface-sunken border border-line p-2.5 rounded-control">
                  {addMember.data.data.activationLink}
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
