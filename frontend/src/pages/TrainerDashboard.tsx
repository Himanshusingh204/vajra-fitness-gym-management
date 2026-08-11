import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrainerBookings, updateBookingStatus } from '../api/booking.api';
import { getGymMembers } from '../api/member.api';
import { getGymWorkoutSlips, createWorkoutSlip } from '../api/workout.api';
import { getMe } from '../api/auth.api';
import { getMemberProgress } from '../api/progress.api';
import { Calendar, Users, Dumbbell, Clock, ClipboardList, CheckCircle, XCircle, Plus, Download, TrendingUp } from 'lucide-react';
import { downloadFile } from '../services/api';
import { ExercisePlanEditor, ExercisePlanView, serializeExercisePlan, type ExerciseItem } from '../components/ExercisePlan';
import { LineChart } from '../components/charts';

const tabs = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'clients', label: 'My Clients', icon: Users },
  { id: 'workouts', label: 'Workout Slips', icon: Dumbbell },
  { id: 'progress', label: 'Member Progress', icon: TrendingUp },
  { id: 'bookings', label: 'Session Bookings', icon: Calendar },
];

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
};

const TrainerDashboard = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const gymId = me?.trainerDetails?.gym?.id;

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['trainerBookings'],
    queryFn: getTrainerBookings,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: () => getGymMembers(gymId),
    enabled: !!gymId && activeTab === 'clients',
  });

  const { data: slips, isLoading: slipsLoading } = useQuery({
    queryKey: ['gymSlips', gymId],
    queryFn: () => getGymWorkoutSlips(gymId),
    enabled: !!gymId && (activeTab === 'workouts' || activeTab === 'overview'),
  });

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

  const todayCount = bookings?.filter((b: any) => isToday(b.date) && b.status !== 'CANCELLED').length ?? 0;
  const upcomingCount = bookings?.filter((b: any) => !isToday(b.date) && b.date >= new Date().toISOString().slice(0, 10) && b.status !== 'CANCELLED').length ?? 0;
  const completedCount = bookings?.filter((b: any) => b.status === 'COMPLETED').length ?? 0;
  const mySlipCount = slips?.filter((s: any) => s.trainer?.user?.username === user?.username).length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-2">
            Trainer Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back, <span className="font-bold text-[var(--color-primary)]">{user?.username}</span>
            {gymId && <> · <span className="text-gray-400">{me?.trainerDetails?.gym?.name}</span></>}
          </p>
        </div>

        <div className="flex gap-2 mb-8 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
              <Calendar className="w-8 h-8 text-[var(--color-primary)] mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{todayCount}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
              <Clock className="w-8 h-8 text-amber-500 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Upcoming Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{upcomingCount}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
              <Dumbbell className="w-8 h-8 text-purple-500 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Slips Assigned</p>
              <p className="text-3xl font-extrabold dark:text-white">{mySlipCount}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-white/10">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Sessions</p>
              <p className="text-3xl font-extrabold dark:text-white">{completedCount}</p>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h2 className="font-bold text-lg dark:text-white">Members at {me?.trainerDetails?.gym?.name || 'your gym'}</h2>
            </div>
            {membersLoading ? (
              <div className="p-10 text-center text-gray-500">Loading members...</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {members?.map((m: any) => (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
                        {m.user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">{m.user?.username}</p>
                        <p className="text-xs text-gray-500">{m.user?.email}</p>
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
                {(!members || members.length === 0) && (
                  <div className="p-10 text-center text-gray-500">No members found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h2 className="font-bold text-lg dark:text-white">Create Workout Slip</h2>
              </div>
              <div className="p-6">
                <CreateSlipForm members={members || []} gymId={gymId} onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['gymSlips', gymId] });
                  queryClient.invalidateQueries({ queryKey: ['gymMembers', gymId] });
                }} />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h2 className="font-bold text-lg dark:text-white">All Workout Slips</h2>
              </div>
              {slipsLoading ? (
                <div className="p-10 text-center text-gray-500">Loading slips...</div>
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
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
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
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
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
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center text-gray-400">
                Pick a member above to see their weight trend and measurement history.
              </div>
            ) : progressLoading ? (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-10 text-center text-gray-400">Loading…</div>
            ) : !progress || progress.entries === 0 ? (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center text-gray-400">
                This member hasn't logged any progress entries yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Current Weight</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.latest?.weight ?? '—'} kg</p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">BMI</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.bmi ?? '—'}</p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Change Since Start</p>
                    <p className={`text-2xl font-extrabold ${(progress.weightChange ?? 0) <= 0 ? 'text-green-600' : 'text-amber-500'}`}>
                      {progress.weightChange != null ? `${progress.weightChange > 0 ? '+' : ''}${progress.weightChange} kg` : '—'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Entries Logged</p>
                    <p className="text-2xl font-extrabold dark:text-white">{progress.entries}</p>
                  </div>
                </div>

                {progress.logs.length >= 2 && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 p-6">
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

                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                    <h2 className="font-bold text-lg dark:text-white">Measurement History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          {['Date', 'Weight', 'Height', 'Body Fat'].map((h) => (
                            <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
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

        {activeTab === 'bookings' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h2 className="font-bold text-lg dark:text-white">Session Bookings</h2>
            </div>
            <div className="p-6">
              {bookingsLoading ? <div className="text-gray-400">Loading bookings...</div> : (
                <div className="space-y-4">
                  {bookings?.map((b: any) => (
                    <div key={b.id} className="p-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold dark:text-white text-lg">{b.user?.username}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-4 h-4" /> {b.date} <Clock className="w-4 h-4 ml-2" /> {b.time}
                          {isToday(b.date) && <span className="text-xs font-bold text-[var(--color-primary)] ml-2">TODAY</span>}
                        </p>
                        {b.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-white dark:bg-black/20 p-2 rounded">Notes: {b.notes}</p>}
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
                              <CheckCircle className="w-4 h-4" /> Confirm
                            </button>
                            <button onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'CANCELLED' })} disabled={updateStatusMutation.isPending} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Decline
                            </button>
                          </>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <>
                            <button onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'COMPLETED' })} disabled={updateStatusMutation.isPending} className="bg-green-500 hover:bg-green-600 text-white rounded font-bold text-sm px-3 py-1.5 flex items-center gap-1 transition-colors">
                              <CheckCircle className="w-4 h-4" /> Mark Complete
                            </button>
                            <button onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'CANCELLED' })} disabled={updateStatusMutation.isPending} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Cancel
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
    </div>
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
      {error && <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">{error}</div>}
      {success && <div className="text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member *</label>
          <select required className="input-field" value={form.memberId} onChange={(e) => setForm({...form, memberId: e.target.value})}>
            <option value="">-- Select Member --</option>
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>{m.user?.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input className="input-field" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Strength Week 1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exercises *</label>
        <ExercisePlanEditor value={items} onChange={setItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
          <input type="date" className="input-field" value={form.validUntil} onChange={(e) => setForm({...form, validUntil: e.target.value})} />
        </div>
        <button type="submit" disabled={loading || !gymId} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> {loading ? 'Creating...' : 'Create Slip'}
        </button>
      </div>
    </form>
  );
};

export default TrainerDashboard;
