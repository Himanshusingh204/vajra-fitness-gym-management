import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { createBranch, deleteBranch } from '../../api/branch.api';
import { useGym } from './GymContext';
import BranchFilter from './BranchFilter';

export default function BranchesPanel() {
  const { gym: branch, branches, branchesLoading, confirm: setConfirmAction } = useGym();
  const qc = useQueryClient();

  const [newBranchForm, setNewBranchForm] = useState({ name: '', address: '', city: '', state: '', phone: '' });
  const createBranchMut = useMutation({
    mutationFn: (data: typeof newBranchForm) => createBranch(branch?.id, { ...data, phone: data.phone || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', branch?.id] });
      setNewBranchForm({ name: '', address: '', city: '', state: '', phone: '' });
    },
  });
  const disableBranchMut = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches', branch?.id] }),
  });

  return (
    <div className="bg-surface rounded-card border border-line p-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-bold text-lg">Branches</h2>
          <p className="text-sm text-ink-muted mt-0.5">Manage your gym's physical locations. Members, staff and classes can be assigned to a branch.</p>
        </div>
        <BranchFilter />
      </div>

      {branchesLoading ? (
        <div className="h-24 bg-surface-sunken rounded-control animate-pulse" />
      ) : branches.length === 0 ? (
        <p className="text-sm text-ink-muted py-4">No branches yet. Add your first branch below.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {branches.map((b) => (
            <div key={b.id} className={`rounded-card border p-4 ${b.isActive ? 'border-line' : 'border-line opacity-80'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink flex items-center gap-2 flex-wrap">
                    {b.name}
                    {b.status === 'PENDING' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning-soft text-warning-ink">Pending approval</span>
                    ) : b.status === 'REJECTED' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger-ink">Rejected</span>
                    ) : b.isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success-ink">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted">Disabled</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">{b.address} · {b.city}, {b.state}</p>
                  {b.phone && <p className="text-xs text-ink-muted mt-0.5">+91 {b.phone}</p>}
                  {b.status === 'PENDING' && (
                    <p className="text-xs text-warning-ink mt-1.5">Awaiting Super Admin review before members/staff can be assigned.</p>
                  )}
                  {b.status === 'REJECTED' && b.rejectionReason && (
                    <p className="text-xs text-danger-ink mt-1.5">Reason: {b.rejectionReason}</p>
                  )}
                  {b.status === 'APPROVED' && (
                    <p className="text-xs text-ink-muted mt-1.5">
                      {b._count?.members ?? 0} members · {b._count?.trainers ?? 0} trainers · {b._count?.staff ?? 0} staff · {b._count?.classes ?? 0} classes
                    </p>
                  )}
                </div>
                {b.status === 'APPROVED' && b.isActive && (
                  <button
                    onClick={() => setConfirmAction({
                      title: 'Disable branch',
                      message: `Disable branch "${b.name}"? Members/staff assigned to it must be moved to another branch first.`,
                      onConfirm: () => { disableBranchMut.mutate(b.id); setConfirmAction(null); },
                    })}
                    disabled={disableBranchMut.isPending}
                    className="text-xs font-semibold text-danger-ink hover:text-danger-ink hover:underline shrink-0"
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-bold text-lg mb-4">Request a new branch</h3>
      <p className="text-xs text-ink-muted -mt-2 mb-4">New branches are reviewed by the Vajra Fitness team before they go live.</p>
      <form
        className="grid sm:grid-cols-2 gap-4"
        onSubmit={(e) => { e.preventDefault(); createBranchMut.mutate(newBranchForm); }}
      >
        <input className="input-field" placeholder="Branch Name (e.g. Andheri West)" value={newBranchForm.name} onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })} required />
        <input className="input-field" placeholder="Address" value={newBranchForm.address} onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })} required />
        <input className="input-field" placeholder="City" value={newBranchForm.city} onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })} required />
        <input className="input-field" placeholder="State" value={newBranchForm.state} onChange={(e) => setNewBranchForm({ ...newBranchForm, state: e.target.value })} required />
        <input className="input-field" placeholder="Phone (optional)" value={newBranchForm.phone} onChange={(e) => setNewBranchForm({ ...newBranchForm, phone: e.target.value })} />
        <button type="submit" disabled={createBranchMut.isPending || !branch?.id} className="btn-primary py-2.5">
          <Plus className="w-4 h-4" /> {createBranchMut.isPending ? 'Submitting…' : 'Submit for Approval'}
        </button>
        <div className="sm:col-span-2" aria-live="polite">
          {createBranchMut.isError && (
            <p className="text-sm text-danger-ink">{(createBranchMut.error as any)?.response?.data?.error || 'Failed to submit branch.'}</p>
          )}
          {createBranchMut.isSuccess && (
            <p className="text-sm text-success-ink">Branch submitted - it'll go live once approved.</p>
          )}
        </div>
      </form>
    </div>
  );
}
