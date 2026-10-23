import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download } from 'lucide-react';
import api, { downloadFile } from '../../services/api';
import { ExercisePlanEditor, ExercisePlanView } from '../../components/ExercisePlan';
import { serializeExercisePlan, type ExerciseItem } from '../../utils/exercisePlan';
import { useGym } from './GymContext';
import type { Member, StaffEntry, WorkoutSlip } from './types';

export default function WorkoutsPanel() {
  const { gym: branch, branchFilter } = useGym();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', branch?.id, branchFilter],
    queryFn: () => api.get(`/members/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: workouts = [], isLoading: workoutsLoading } = useQuery<WorkoutSlip[]>({
    queryKey: ['workouts', branch?.id],
    queryFn: () => api.get(`/workouts/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const { data: staffData } = useQuery<{ trainers: StaffEntry[]; staff: StaffEntry[] }>({
    queryKey: ['staff', branch?.id, branchFilter],
    queryFn: () => api.get(`/staff/gym/${branch?.id}`, { params: branchFilter ? { branchId: branchFilter } : undefined }).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [slipForm, setSlipForm] = useState({ memberId: '', title: '', validUntil: '', trainerId: '' });
  const [slipExercises, setSlipExercises] = useState<ExerciseItem[]>([{ exercise: '', sets: '', reps: '', notes: '' }]);
  const createSlip = useMutation({
    mutationFn: (data: typeof slipForm & { exercises: string }) => api.post(`/workouts/member/${data.memberId}`, {
      title: data.title,
      exercises: data.exercises,
      validUntil: data.validUntil || null,
      trainerId: data.trainerId || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts', branch?.id] });
      setSlipForm({ memberId: '', title: '', validUntil: '', trainerId: '' });
      setSlipExercises([{ exercise: '', sets: '', reps: '', notes: '' }]);
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">Assign a workout slip</h3>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!slipForm.memberId || !slipExercises.some((it) => it.exercise.trim())) return;
              createSlip.mutate({ ...slipForm, exercises: serializeExercisePlan(slipExercises) });
            }}
          >
            <div>
              <label htmlFor="workoutspanel-f1" className="block text-sm font-semibold text-ink mb-1.5">Member</label>
              <select id="workoutspanel-f1" className="input-field" value={slipForm.memberId} onChange={(e) => setSlipForm({ ...slipForm, memberId: e.target.value })} required>
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.user?.username} ({m.user?.email})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="workoutspanel-f2" className="block text-sm font-semibold text-ink mb-1.5">Title</label>
                <input id="workoutspanel-f2" className="input-field" value={slipForm.title} onChange={(e) => setSlipForm({ ...slipForm, title: e.target.value })} placeholder="e.g. Push Day" />
              </div>
              <div>
                <label htmlFor="workoutspanel-f3" className="block text-sm font-semibold text-ink mb-1.5">Valid until</label>
                <input id="workoutspanel-f3" className="input-field" type="date" value={slipForm.validUntil} onChange={(e) => setSlipForm({ ...slipForm, validUntil: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="workoutspanel-f4" className="block text-sm font-semibold text-ink mb-1.5">Trainer (optional)</label>
              <select id="workoutspanel-f4" className="input-field" value={slipForm.trainerId} onChange={(e) => setSlipForm({ ...slipForm, trainerId: e.target.value })}>
                <option value="">No trainer</option>
                {(staffData?.trainers || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="block text-sm font-semibold text-ink mb-2">Exercises</p>
              <ExercisePlanEditor value={slipExercises} onChange={setSlipExercises} />
            </div>
            <button type="submit" className="btn-primary justify-center" disabled={createSlip.isPending || !branch?.id}>
              <Plus className="w-4 h-4" /> Assign Slip
            </button>
          </form>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h2 className="font-bold text-lg">Workout Slips ({workouts.length})</h2>
          </div>
          {workoutsLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : workouts.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">No workout slips assigned yet.</div>
          ) : (
            <div className="divide-y divide-line max-h-[560px] overflow-y-auto">
              {workouts.map((slip) => (
                <div key={slip.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold text-ink">{slip.title || 'Workout Plan'}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {slip.member?.user?.username} · by {slip.trainer?.user?.username || 'Gym Admin'} · {new Date(slip.assignedDate).toLocaleDateString('en-IN')}
                        {slip.validUntil ? ` · valid till ${new Date(slip.validUntil).toLocaleDateString('en-IN')}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(`/workouts/${slip.id}/pdf`, `workout-${slip.id.slice(0, 8)}.pdf`)}
                      className="inline-flex items-center gap-1.5 text-accent-ink font-semibold text-sm hover:underline shrink-0"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </div>
                  <ExercisePlanView exercises={slip.exercises} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
