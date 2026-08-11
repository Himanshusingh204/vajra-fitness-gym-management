import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe } from '../api/auth.api';
import { getGymMembers } from '../api/member.api';
import { getGymAttendance, markAttendance } from '../api/staff.api';
import { CalendarDays, Users, UserPlus, Search, CheckCircle2 } from 'lucide-react';

const StaffDashboard = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('checkin');
  const [search, setSearch] = useState('');

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const gymId = me?.staffDetails?.gym?.id;

  const today = new Date().toISOString().slice(0, 10);

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['todayAttendance', gymId, today],
    queryFn: () => getGymAttendance(gymId, { date: today, limit: 100 }),
    enabled: !!gymId && activeTab === 'attendance',
  });

  const { data: members } = useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: () => getGymMembers(gymId),
    enabled: !!gymId,
  });

  const checkinMutation = useMutation({
    mutationFn: (memberId: string) => markAttendance(gymId, { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance', gymId, today] });
      queryClient.invalidateQueries({ queryKey: ['gymMembers', gymId] });
    },
  });

  const checkedInMemberIds = new Set((attendance?.records || []).map((r: any) => r.memberId));

  const filteredMembers = (members || []).filter((m: any) =>
    m.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'checkin', label: 'Check-In', icon: UserPlus },
    { id: 'attendance', label: "Today's Attendance", icon: CalendarDays },
    { id: 'members', label: 'Member Lookup', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 border-b border-[var(--color-border)] pb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">Staff Portal</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back, <span className="font-bold text-[var(--color-primary)]">{user?.username}</span>
            {gymId && <> · <span className="text-gray-400">{me?.staffDetails?.gym?.name}</span></>}
          </p>
        </div>

        <div className="flex gap-2 mb-8 bg-[var(--color-surface)] border border-[var(--color-border)] p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'checkin' && (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg dark:text-white">Mark Attendance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Check in a member for today ({today}).</p>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-10"
                  placeholder="Search member by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredMembers.map((m: any) => {
                  const alreadyChecked = checkedInMemberIds.has(m.id);
                  return (
                    <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold shrink-0">
                          {m.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold dark:text-white truncate">{m.user?.username}</p>
                          <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                        </div>
                      </div>
                      {alreadyChecked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" /> Checked In
                        </span>
                      ) : (
                        <button
                          onClick={() => checkinMutation.mutate(m.id)}
                          disabled={checkinMutation.isPending}
                          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                        >
                          <UserPlus className="w-4 h-4" /> Check In
                        </button>
                      )}
                    </div>
                  );
                })}
                {(!filteredMembers || filteredMembers.length === 0) && (
                  <div className="py-10 text-center text-gray-500">No members found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <h2 className="font-bold text-lg dark:text-white">Today's Attendance</h2>
              <span className="text-sm font-semibold text-gray-500">{attendance?.total ?? 0} check-ins</span>
            </div>
            {attendanceLoading ? (
              <div className="p-10 text-center text-gray-500">Loading attendance...</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {(attendance?.records || []).map((r: any) => (
                  <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                        {(r.member?.user?.username || r.staff?.user?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">{r.member?.user?.username || r.staff?.user?.username}</p>
                        <p className="text-xs text-gray-500">
                          {r.member ? 'Member' : 'Staff'} · {new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {r.status}
                    </span>
                  </div>
                ))}
                {(!attendance?.records || attendance.records.length === 0) && (
                  <div className="p-10 text-center text-gray-500">No check-ins recorded today yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg dark:text-white">Member Lookup</h2>
            </div>
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-10" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredMembers.map((m: any) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
                        {m.user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">{m.user?.username}</p>
                        <p className="text-xs text-gray-500">{m.user?.email} · {m.user?.phone || 'No phone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                        m.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        m.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>{m.status}</span>
                      <span className="text-xs font-semibold text-gray-500">{m.membershipPlan?.name || 'No plan'}</span>
                    </div>
                  </div>
                ))}
                {(!filteredMembers || filteredMembers.length === 0) && (
                  <div className="py-10 text-center text-gray-500">No members found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
