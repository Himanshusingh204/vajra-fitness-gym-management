import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useGym } from './GymContext';
import BranchFilter from './BranchFilter';
import type { StaffEntry } from './types';

export default function TeamPanel() {
  const { gym: branch, approvedBranches, branchFilter, confirm: setConfirmAction } = useGym();
  const qc = useQueryClient();
  const { data: staffData, isLoading: staffLoading } = useQuery<{ trainers: StaffEntry[]; staff: StaffEntry[] }>({
    queryKey: ['staff', branch?.id, branchFilter],
    queryFn: () => api.get(`/staff/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [staffForm, setStaffForm] = useState({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '', branchId: '' });
  const addStaff = useMutation({
    mutationFn: (data: typeof staffForm) => api.post(`/staff/gym/${branch?.id}`, { ...data, branchId: data.branchId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setStaffForm({ username: '', email: '', phone: '', roleType: 'STAFF', roleSpecifics: '', branchId: '' });
    },
  });
  const deleteStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
    },
  });
  const renderStaffTable = (list: StaffEntry[], type: 'trainers' | 'staff') => (
    <div>
      <h3 className="font-bold text-ink mb-3 capitalize">{type}</h3>
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted py-3">No {type} yet.</p>
      ) : (
        <div className="divide-y divide-line">
          {list.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{s.user.username}</p>
                <p className="text-xs text-ink-muted">{s.user.email} · {type === 'trainers' ? (s.specialization || 'Trainer') : s.role}{s.branch?.name ? ` · ${s.branch.name}` : ''}</p>
              </div>
              <button
                onClick={() => setConfirmAction({
                  title: 'Remove staff member',
                  message: `Remove ${s.user.username}? They will lose access immediately.`,
                  onConfirm: () => { deleteStaff.mutate(s.id); setConfirmAction(null); },
                })}
                className="text-xs font-semibold text-danger-ink hover:text-danger-ink hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="bg-surface rounded-card border border-line p-6">
        <h3 className="font-bold text-lg mb-4">Add Staff / Trainer</h3>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); addStaff.mutate(staffForm); }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="teampanel-f1" className="block text-sm font-semibold text-ink mb-1.5">Role</label>
              <select id="teampanel-f1" className="input-field" value={staffForm.roleType} onChange={(e) => setStaffForm({ ...staffForm, roleType: e.target.value })}>
                <option value="STAFF">Staff</option>
                <option value="TRAINER">Trainer</option>
              </select>
            </div>
            <div>
              <label htmlFor="teampanel-f2" className="block text-sm font-semibold text-ink mb-1.5">{staffForm.roleType === 'TRAINER' ? 'Specialization' : 'Position'}</label>
              <input id="teampanel-f2" className="input-field" value={staffForm.roleSpecifics} onChange={(e) => setStaffForm({ ...staffForm, roleSpecifics: e.target.value })} placeholder={staffForm.roleType === 'TRAINER' ? 'e.g. Strength & Conditioning' : 'e.g. Receptionist'} required />
            </div>
          </div>
          <div>
            <label htmlFor="teampanel-f3" className="block text-sm font-semibold text-ink mb-1.5">Full name</label>
            <input id="teampanel-f3" className="input-field" value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="teampanel-f4" className="block text-sm font-semibold text-ink mb-1.5">Email</label>
              <input id="teampanel-f4" className="input-field" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="teampanel-f5" className="block text-sm font-semibold text-ink mb-1.5">Phone</label>
              <input id="teampanel-f5" className="input-field" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
            </div>
          </div>
          {approvedBranches.length > 0 && (
            <div>
              <label htmlFor="teampanel-f6" className="block text-sm font-semibold text-ink mb-1.5">Branch</label>
              <select id="teampanel-f6" className="input-field" value={staffForm.branchId} onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}>
                <option value="">No branch</option>
                {approvedBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary justify-center" disabled={addStaff.isPending || !branch?.id}>
            <Plus className="w-4 h-4" /> Add {staffForm.roleType === 'TRAINER' ? 'Trainer' : 'Staff'}
          </button>
          {addStaff.isSuccess && (
            <div className="text-sm space-y-1.5">
              <p className="text-success-ink">Added. Share the activation link to let them set their password:</p>
              {addStaff.data?.data?.activationLink && (
                <p className="text-accent-ink font-mono text-xs break-all bg-surface-sunken border border-line p-2.5 rounded-control">
                  {addStaff.data.data.activationLink}
                </p>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="bg-surface rounded-card border border-line p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-lg">Team ({staffData?.trainers.length || 0} trainers · {staffData?.staff.length || 0} staff)</h2>
          <BranchFilter />
        </div>
        {staffLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : (
          <div className="space-y-6">
            {renderStaffTable(staffData?.trainers || [], 'trainers')}
            <div className="border-t border-line" />
            {renderStaffTable(staffData?.staff || [], 'staff')}
          </div>
        )}
      </div>
    </div>
  );
}
