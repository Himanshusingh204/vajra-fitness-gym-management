import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import api from '../../services/api';
import { localDateString } from '../../utils/format';
import { useGym } from './GymContext';
import BranchFilter from './BranchFilter';
import type { AttendanceRecord, GymStats, Member, StaffEntry } from './types';

export default function AttendancePage() {
  const { gym: branch, branchFilter } = useGym();
  const qc = useQueryClient();
  const today = localDateString();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: staffData } = useQuery<{ trainers: StaffEntry[]; staff: StaffEntry[] }>({
    queryKey: ['staff', branch?.id, branchFilter],
    queryFn: () => api.get(`/staff/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<GymStats>({
    queryKey: ['gym-stats', branch?.id],
    queryFn: () => api.get(`/gym/${branch?.id}/stats`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', branch?.id, branchFilter],
    queryFn: () => api.get(`/attendance/gym/${branch?.id}`, { params: { date: today, ...(branchFilter ? { branchId: branchFilter } : {}) } }).then((r) => r.data.records),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [checkInForm, setCheckInForm] = useState({ memberId: '', staffId: '' });
  const markAttendance = useMutation({
    mutationFn: (data: typeof checkInForm) => api.post(`/attendance/gym/${branch?.id}`, {
      ...(data.memberId ? { memberId: data.memberId } : {}),
      ...(data.staffId ? { staffId: data.staffId } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', branch?.id] });
      qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] });
      setCheckInForm({ memberId: '', staffId: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Check-in</h3>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (checkInForm.memberId || checkInForm.staffId) markAttendance.mutate(checkInForm); }}
          >
            <div>
              <label htmlFor="attendancepage-f1" className="block text-sm font-semibold text-ink mb-1.5">Member</label>
              <select id="attendancepage-f1" className="input-field" value={checkInForm.memberId} onChange={(e) => setCheckInForm({ ...checkInForm, memberId: e.target.value })}>
                <option value="">No member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="attendancepage-f2" className="block text-sm font-semibold text-ink mb-1.5">Staff (optional)</label>
              <select id="attendancepage-f2" className="input-field" value={checkInForm.staffId} onChange={(e) => setCheckInForm({ ...checkInForm, staffId: e.target.value })}>
                <option value="">No staff</option>
                {(staffData?.staff || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.user.username} ({s.role})</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary justify-center" disabled={markAttendance.isPending || !branch?.id}>
              <ClipboardCheck className="w-4 h-4" /> Mark Present
            </button>
            <div aria-live="polite">
              {markAttendance.isSuccess && <p className="text-success-ink text-sm">Checked in successfully.</p>}
            </div>
          </form>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex justify-between items-center gap-3">
            <h2 className="font-bold text-lg">Today's Attendance ({attendance.length})</h2>
            <div className="flex items-center gap-3">
              <BranchFilter />
              <span className="text-xs font-semibold text-info-ink">{stats?.attendanceToday ?? 0} check-ins</span>
            </div>
          </div>
          {attendanceLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : attendance.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">No check-ins yet today.</div>
          ) : (
            <div className="divide-y divide-line max-h-[420px] overflow-y-auto">
              {attendance.map((a) => (
                <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">
                      {a.member?.user?.username || a.staff?.user?.username || 'Unknown'}
                    </p>
                    <p className="text-xs text-ink-muted">{a.member ? 'Member' : 'Staff'} · {new Date(a.checkIn).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-success-soft text-success-ink">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
