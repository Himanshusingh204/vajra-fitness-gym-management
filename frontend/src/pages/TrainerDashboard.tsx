import React, { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate, useOutletContext } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrainerBookings, updateBookingStatus } from '../api/booking.api';
import { getGymMembers } from '../api/member.api';
import { getGymWorkoutSlips, createWorkoutSlip } from '../api/workout.api';
import { getMe } from '../api/auth.api';
import { getMemberProgress } from '../api/progress.api';
import { getMyPayslips } from '../api/payslip.api';
import { getClasses, type GymClass } from '../api/class.api';
import EmptyState from '../components/ui/EmptyState';
import { Calendar, Users, Dumbbell, Clock, CheckCircle, XCircle, Plus, Download, Wallet, CalendarDays } from 'lucide-react';
import { downloadFile } from '../services/api';
import { ExercisePlanEditor, ExercisePlanView } from '../components/ExercisePlan';
import { serializeExercisePlan, type ExerciseItem } from '../utils/exercisePlan';
import { LineChart } from '../components/charts';
import { localDateString } from '../utils/format';

const isToday = (dateStr: string) => {
  return dateStr === localDateString();
};

const TrainerDashboard = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const activeTab = useOutletContext<string | undefined>() ?? '';

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const gymId = me?.trainerDetails?.gym?.id;

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['trainerBookings'],
    queryFn: getTrainerBookings,
    refetchInterval: 30000,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: () => getGymMembers(gymId),
    enabled: !!gymId && ['clients', 'overview'].includes(activeTab),
  });

  const { data: slips, isLoading: slipsLoading } = useQuery({
    queryKey: ['gymSlips', gymId],
    queryFn: () => getGymWorkoutSlips(gymId),
    enabled: !!gymId && (activeTab === 'workouts' || activeTab === 'overview'),
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['myPayslips'],
    queryFn: getMyPayslips,
    enabled: activeTab === 'overview' || activeTab === 'earnings',
    refetchInterval: 60000,
  });

  const { data: gymClasses = [] } = useQuery({
    queryKey: ['gymClasses', gymId],
    queryFn: () => getClasses(gymId!),
    enabled: !!gymId && activeTab === 'schedule',
    refetchInterval: 60000,
  });

  const [clientFilter, setClientFilter] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [progressMemberId, setProgressMemberId] = useState('');
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['memberProgress', progressMemberId],
    queryFn: () => getMemberProgress(progressMemberId),
    enabled: !!progressMemberId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerBookings'] });
    },
  });

  const [bookingToDecline, setBookingToDecline] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  const todayCount = bookings?.filter((b: any) => isToday(b.date) && b.status !== 'CANCELLED').length ?? 0;
  const upcomingCount = bookings?.filter((b: any) => !isToday(b.date) && b.date >= localDateString() && b.status !== 'CANCELLED').length ?? 0;
  const completedCount = bookings?.filter((b: any) => b.status === 'COMPLETED').length ?? 0;
  const activeClients = members?.filter((m: any) => m.status === 'ACTIVE').length ?? 0;
  const pendingRequests = bookings?.filter((b: any) => b.status === 'PENDING').length ?? 0;
  const thisMonth = new Date();
  const monthEarnings = payslips
    .filter((p) => p.month === thisMonth.getMonth() + 1 && p.year === thisMonth.getFullYear())
    .reduce((sum, p) => sum + Number(p.netPay), 0);
  const mySlipCount = slips?.filter((s: any) => s.trainer?.user?.username === user?.username).length ?? 0;

  if (!activeTab) return <Navigate to="/trainer" replace />;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {activeTab === 'overview' && (
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold dark:text-white">Welcome back, {user?.username?.split(' ')[0]}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {pendingRequests > 0
                ? `${pendingRequests} session ${pendingRequests === 1 ? 'request is' : 'requests are'} waiting for you.`
                : 'No session requests are waiting. Here is how things look today.'}
            </p>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <Users className="w-8 h-8 text-blue-500 mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Active Clients</p>
              <p className="text-3xl font-extrabold dark:text-white">{activeClients}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <Wallet className="w-8 h-8 text-emerald-500 mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Earned This Month</p>
              <p className="text-3xl font-extrabold dark:text-white">₹{monthEarnings.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <Calendar className="w-8 h-8 text-[var(--color-primary)] mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{todayCount}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <Clock className="w-8 h-8 text-amber-500 mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Upcoming Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{upcomingCount}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <Dumbbell className="w-8 h-8 text-purple-500 mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Slips Assigned</p>
              <p className="text-3xl font-extrabold dark:text-white">{mySlipCount}</p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{completedCount}</p>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg dark:text-white">Members at {me?.trainerDetails?.gym?.name || 'your gym'}</h2>
              <div role="tablist" aria-label="Client status" className="mt-3 inline-flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                {(['ACTIVE', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    role="tab"
                    aria-selected={clientFilter === st}
                    onClick={() => setClientFilter(st)}
                    className={`px-4 py-1.5 text-xs font-bold transition-colors ${clientFilter === st ? 'bg-[var(--color-primary)] text-white' : 'text-gray-500'}`}
                  >
                    {st === 'ACTIVE' ? 'Active' : 'Pending'} ({members?.filter((m: any) => m.status === st).length ?? 0})
                  </button>
                ))}
              </div>
            </div>
            {membersLoading ? (
              <div className="p-10 text-center text-gray-500">Loading members…</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {members?.filter((m: any) => m.status === clientFilter).map((m: any) => (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold shrink-0">
                        {m.user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold dark:text-white truncate">{m.user?.username}</p>
                        <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
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
                {!members?.some((m: any) => m.status === clientFilter) && (
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title={clientFilter === 'ACTIVE' ? 'No active clients yet' : 'No pending clients'}
                    hint={clientFilter === 'ACTIVE' ? 'Members with an active membership at your gym show up here.' : 'Members waiting for the gym to approve them show up here.'}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <h2 className="font-bold text-lg dark:text-white">Create Workout Slip</h2>
              </div>
              <div className="p-6">
                <CreateSlipForm members={members || []} gymId={gymId} onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['gymSlips', gymId] });
                  queryClient.invalidateQueries({ queryKey: ['gymMembers', gymId] });
                }} />
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <h2 className="font-bold text-lg dark:text-white">All Workout Slips</h2>
              </div>
              {slipsLoading ? (
                <div className="p-10 text-center text-gray-500">Loading slips…</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {slips?.map((s: any) => (
                    <div key={s.id} className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold dark:text-white">{s.title || 'Workout Plan'}</p>
                          <p className="text-xs text-gray-500">
                            Member: {s.member?.user?.username} · {new Date(s.assignedDate).toLocaleDateString('en-IN')}
                            {s.trainer && <span> · by {s.trainer.user.username}</span>}
                          </p>
                        </div>
                        <button onClick={() => downloadFile(`/workouts/${s.id}/pdf`, `workout-${s.id.slice(0, 8)}.pdf`)} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline self-start sm:self-auto shrink-0">
                          <Download className="w-3.5 h-3.5" aria-hidden="true" /> PDF
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4">
                        <ExercisePlanView exercises={s.exercises} />
                      </div>
                    </div>
                  ))}
                  {(!slips || slips.length === 0) && (
                    <div className="p-10 text-center text-gray-500">No workout slips created yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select a member</label>
              <select
                className="input-field bg-white! dark:bg-[#1a1a1a]! max-w-sm"
                value={progressMemberId}
                onChange={(e) => setProgressMemberId(e.target.value)}
              >
                <option value="">Choose a client…</option>
                {(members || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.user?.username}</option>
                ))}
              </select>
            </div>

            {!progressMemberId ? (
              <div className="bg-[var(--color-surface)] rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center text-gray-400">
                Pick a member above to see their weight trend and measurement history.
              </div>
            ) : progressLoading ? (
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-10 text-center text-gray-400">Loading…</div>
            ) : !progress || progress.entries === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center text-gray-400">
                This member hasn't logged any progress entries yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[var(--color-surface)] rounded-lg p-5 border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Current Weight</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.latest?.weight ?? '—'} kg</p>
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-lg p-5 border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">BMI</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.bmi ?? '—'}</p>
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-lg p-5 border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Change Since Start</p>
                    <p className={`text-2xl font-extrabold ${(progress.weightChange ?? 0) <= 0 ? 'text-green-600' : 'text-amber-500'}`}>
                      {progress.weightChange != null ? `${progress.weightChange > 0 ? '+' : ''}${progress.weightChange} kg` : '—'}
                    </p>
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-lg p-5 border border-[var(--color-border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Entries Logged</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.entries}</p>
                  </div>
                </div>

                {progress.logs.length >= 2 && (
                  <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
                    <h3 className="font-bold text-[var(--color-deepgray)] dark:text-white mb-4">Weight Trend</h3>
                    <div className="h-64">
                      <LineChart
                        series={[{
                          name: 'Weight (kg)',
                          data: [...progress.logs].reverse().map((l) => ({
                            label: new Date(l.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                            value: l.weight,
                          })),
                        }]}
                        config={{ height: 240, showArea: true }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h2 className="font-bold text-lg dark:text-white">Measurement History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          {['Date', 'Weight', 'Height', 'Body Fat'].map((h) => (
                            <th scope="col" key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {progress.logs.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-6 py-3 text-gray-500">{new Date(l.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-3 font-semibold dark:text-white">{l.weight} kg</td>
                            <td className="px-6 py-3 text-gray-500">{l.height ? `${l.height} cm` : '—'}</td>
                            <td className="px-6 py-3 text-gray-500">{l.bodyFat ? `${l.bodyFat}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'schedule' && <WeekSchedule bookings={bookings ?? []} classes={gymClasses.filter((c) => c.trainer?.user?.id === user?.id)} />}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                ['This month', monthEarnings],
                ['This year', payslips.filter((p) => p.year === thisMonth.getFullYear()).reduce((n, p) => n + Number(p.netPay), 0)],
                ['Still to be paid', payslips.filter((p) => p.status !== 'PAID').reduce((n, p) => n + Number(p.netPay), 0)],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-3xl font-extrabold dark:text-white">₹{(value as number).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h2 className="font-bold text-lg dark:text-white">Payslips</h2>
                <span className="text-xs text-gray-500">{completedCount} sessions completed so far</span>
              </div>
              {payslipsLoading ? (
                <div className="p-10 text-center text-gray-500">Loading payslips…</div>
              ) : payslips.length === 0 ? (
                <EmptyState icon={<Wallet className="h-8 w-8" />} title="No payslips yet" hint="Your gym adds a payslip each month. Salary, bonuses and deductions will be broken down here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {['Month', 'Basic', 'Bonus', 'Deductions', 'Net pay', 'Status'].map((h) => (
                          <th scope="col" key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {payslips.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-3 font-semibold dark:text-white">{new Date(p.year, p.month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                          <td className="px-6 py-3 text-gray-500">₹{Number(p.basicSalary).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-green-600">+₹{Number(p.bonuses).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-red-500">-₹{Number(p.deductions).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 font-bold dark:text-white">₹{Number(p.netPay).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg dark:text-white">Session Bookings</h2>
            </div>
            <div className="p-6">
              {bookingsLoading ? <div className="text-gray-400">Loading bookings…</div> : (
                <div className="space-y-4">
                  {bookings?.map((b: any) => (
                    <div key={b.id} className="p-5 rounded-lg border border-[var(--color-border)] bg-gray-50 dark:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="font-bold dark:text-white text-lg truncate">{b.user?.username}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-4 h-4" aria-hidden="true" /> {b.date} <Clock className="w-4 h-4 ml-2" aria-hidden="true" /> {b.time}
                          {isToday(b.date) && <span className="text-xs font-bold text-[var(--color-primary)] ml-2">TODAY</span>}
                        </p>
                        {b.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-white dark:bg-black/20 p-2 rounded break-words">Notes: {b.notes}</p>}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          b.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>{b.status}</span>

                        {b.status === 'PENDING' && (
                          <>
                            <button onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'CONFIRMED' })} disabled={updateStatusMutation.isPending} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" aria-hidden="true" /> Confirm
                            </button>
                            <button onClick={() => setBookingToDecline(b.id)} disabled={updateStatusMutation.isPending} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" aria-hidden="true" /> Decline
                            </button>
                          </>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <>
                            <button onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'COMPLETED' })} disabled={updateStatusMutation.isPending} className="bg-green-500 hover:bg-green-600 text-white rounded font-bold text-sm px-3 py-1.5 flex items-center gap-1 transition-colors">
                              <CheckCircle className="w-4 h-4" aria-hidden="true" /> Mark Complete
                            </button>
                            <button onClick={() => setBookingToCancel(b.id)} disabled={updateStatusMutation.isPending} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" aria-hidden="true" /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!bookings || bookings.length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      No sessions booked yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={bookingToDecline !== null}
        title="Decline booking?"
        message="This will decline the session request. The member will need to book again if they still want a session."
        confirmLabel="Decline Booking"
        loading={updateStatusMutation.isPending}
        onConfirm={() => {
          if (!bookingToDecline) return;
          updateStatusMutation.mutate({ id: bookingToDecline, status: 'CANCELLED' }, {
            onSettled: () => setBookingToDecline(null),
          });
        }}
        onCancel={() => setBookingToDecline(null)}
      />

      <ConfirmDialog
        open={bookingToCancel !== null}
        title="Cancel booking?"
        message="This will cancel the confirmed session. The member will be notified that the session no longer stands."
        confirmLabel="Cancel Booking"
        loading={updateStatusMutation.isPending}
        onConfirm={() => {
          if (!bookingToCancel) return;
          updateStatusMutation.mutate({ id: bookingToCancel, status: 'CANCELLED' }, {
            onSettled: () => setBookingToCancel(null),
          });
        }}
        onCancel={() => setBookingToCancel(null)}
      />
    </>
  );
};

const CreateSlipForm = ({ members, gymId, onSuccess }: { members: any[], gymId?: string, onSuccess: () => void }) => {
  const [form, setForm] = useState({ memberId: '', title: '', validUntil: '' });
  const [items, setItems] = useState<ExerciseItem[]>([{ exercise: '', sets: '', reps: '', notes: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!items.some((item) => item.exercise.trim())) {
      setError('Add at least one exercise.');
      return;
    }
    setLoading(true);
    try {
      await createWorkoutSlip(form.memberId, { title: form.title || undefined, exercises: serializeExercisePlan(items), validUntil: form.validUntil || undefined });
      setSuccess('Workout slip created successfully!');
      setForm({ memberId: '', title: '', validUntil: '' });
      setItems([{ exercise: '', sets: '', reps: '', notes: '' }]);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create slip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-live="polite">
        {error && <div role="alert" className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">{error}</div>}
        {success && <div role="status" className="text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">{success}</div>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member *</label>
          <select required name="memberId" className="input-field" value={form.memberId} onChange={(e) => setForm({...form, memberId: e.target.value})}>
            <option value="">-- Select Member --</option>
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>{m.user?.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input name="title" autoComplete="off" className="input-field" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Strength Week 1, Upper Body…" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exercises *</label>
        <ExercisePlanEditor value={items} onChange={setItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
          <input type="date" name="validUntil" className="input-field" value={form.validUntil} onChange={(e) => setForm({...form, validUntil: e.target.value})} />
        </div>
        <button type="submit" disabled={loading || !gymId} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" /> {loading ? 'Creating…' : 'Create Slip'}
        </button>
      </div>
    </form>
  );
};

export default TrainerDashboard;

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Next seven days: PT sessions on their exact date, group classes on their weekday.
const WeekSchedule = ({ bookings, classes }: { bookings: any[]; classes: GymClass[] }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const hasAnything = days.some((d) => {
    const key = localDateString(d);
    return bookings.some((b) => b.date === key && b.status !== 'CANCELLED') || classes.some((c) => c.dayOfWeek === WEEKDAYS[d.getDay()]);
  });

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg dark:text-white">Next 7 days</h2>
      {!hasAnything && (
        <div className="bg-[var(--color-surface)] rounded-lg border border-dashed border-[var(--color-border)]">
          <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="Nothing scheduled this week" hint="Session requests from members and group classes you lead will fill this in." />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {days.map((d) => {
          const key = localDateString(d);
          const sessions = bookings.filter((b) => b.date === key && b.status !== 'CANCELLED');
          const todaysClasses = classes.filter((c) => c.dayOfWeek === WEEKDAYS[d.getDay()]);
          const items = [
            ...sessions.map((b) => ({ id: b.id, time: b.time, title: b.user?.username, sub: `PT session, ${b.status.toLowerCase()}`, tone: b.status === 'CONFIRMED' ? 'blue' : 'amber' })),
            ...todaysClasses.map((c) => ({ id: c.id, time: c.startTime ?? '', title: c.name, sub: `Group class${c.location ? `, ${c.location}` : ''}`, tone: 'purple' })),
          ].sort((a, b) => a.time.localeCompare(b.time));
          const toneClass: Record<string, string> = {
            blue: 'border-l-blue-500',
            amber: 'border-l-amber-500',
            purple: 'border-l-purple-500',
          };
          return (
            <div key={key} className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {d.toLocaleDateString('en-IN', { weekday: 'short' })} {d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}
                {key === localDateString() && <span className="ml-2 text-[var(--color-primary)]">Today</span>}
              </p>
              <div className="mt-3 space-y-2">
                {items.length === 0 && <p className="text-sm text-gray-400">Free day</p>}
                {items.map((it) => (
                  <div key={it.id} className={`rounded-md border-l-4 bg-gray-50 dark:bg-white/5 px-3 py-2 ${toneClass[it.tone]}`}>
                    <p className="text-sm font-bold dark:text-white truncate">{it.time} {it.title}</p>
                    <p className="text-xs text-gray-500">{it.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
