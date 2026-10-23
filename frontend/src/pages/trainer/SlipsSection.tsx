import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Dumbbell, Plus } from 'lucide-react';
import { getGymWorkoutSlips, createWorkoutSlip } from '../../api/workout.api';
import { ExercisePlanEditor, ExercisePlanView } from '../../components/ExercisePlan';
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from '../../components/ui';
import { downloadFile } from '../../services/api';
import { serializeExercisePlan, type ExerciseItem } from '../../utils/exercisePlan';
import { useGymMembers, useTrainerMe } from './useTrainer';

const blankItem = (): ExerciseItem => ({ exercise: '', sets: '', reps: '', notes: '' });

export default function SlipsSection() {
  const queryClient = useQueryClient();
  const { data: me } = useTrainerMe();
  const gymId = me?.trainerDetails?.gym?.id;
  const { data: members } = useGymMembers(gymId);
  const { data: slips, isLoading } = useQuery({
    queryKey: ['gymSlips', gymId],
    queryFn: () => getGymWorkoutSlips(gymId),
    enabled: !!gymId,
  });

  const [form, setForm] = useState({ memberId: '', title: '', validUntil: '' });
  const [items, setItems] = useState<ExerciseItem[]>([blankItem()]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!items.some((item) => item.exercise.trim())) {
      setError('Add at least one exercise.');
      return;
    }
    setSaving(true);
    try {
      await createWorkoutSlip(form.memberId, {
        title: form.title || undefined,
        exercises: serializeExercisePlan(items),
        validUntil: form.validUntil || undefined,
      });
      setSuccess('Workout slip created.');
      setForm({ memberId: '', title: '', validUntil: '' });
      setItems([blankItem()]);
      queryClient.invalidateQueries({ queryKey: ['gymSlips', gymId] });
      queryClient.invalidateQueries({ queryKey: ['gymMembers', gymId] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create slip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Workout slips" description="Write a plan for a member and download it as a PDF." />

      <Card>
        <h2 className="font-semibold text-ink">Create a slip</h2>
        <form onSubmit={submit} className="mt-4 space-y-5">
          <div aria-live="polite">
            {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger-ink">{error}</p>}
            {success && <p role="status" className="rounded-control bg-success-soft p-3 text-sm text-success-ink">{success}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Member" required>
              <Select required value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">Select a member</option>
                {(members || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.user?.username}</option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input autoComplete="off" placeholder="Strength week 1, upper body" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Exercises <span className="text-danger-ink" aria-hidden="true">*</span></p>
            <ExercisePlanEditor value={items} onChange={setItems} />
          </div>
          <div className="grid items-end gap-4 md:grid-cols-2">
            <Field label="Valid until">
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </Field>
            <Button type="submit" icon={Plus} loading={saving} disabled={!gymId}>Create slip</Button>
          </div>
        </form>
      </Card>

      <h2 className="font-semibold text-ink">All slips</h2>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !slips || slips.length === 0 ? (
        <Card><EmptyState icon={Dumbbell} title="No workout slips yet" /></Card>
      ) : (
        <ul className="space-y-4">
          {slips.map((s: any) => (
            <li key={s.id}>
              <Card>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{s.title || 'Workout plan'}</p>
                    <p className="text-sm text-ink-muted">
                      {s.member?.user?.username}, {new Date(s.assignedDate).toLocaleDateString('en-IN')}
                      {s.trainer && <span>, by {s.trainer.user.username}</span>}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadFile(`/workouts/${s.id}/pdf`, `workout-${s.id.slice(0, 8)}.pdf`)}>
                    PDF
                  </Button>
                </div>
                <div className="rounded-control bg-surface-sunken p-4">
                  <ExercisePlanView exercises={s.exercises} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
