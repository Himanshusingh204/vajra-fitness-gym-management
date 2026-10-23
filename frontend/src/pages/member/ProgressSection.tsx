import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProgress, createProgressLog } from '../../api/progress.api';
import { Button, Card, EmptyState, Field, Input, PageHeader, Skeleton, StatTile } from '../../components/ui';
import { TrendingUp } from 'lucide-react';

export default function ProgressSection() {
  const queryClient = useQueryClient();
  const { data: progress, isLoading } = useQuery({ queryKey: ['myProgress'], queryFn: getMyProgress, refetchInterval: 30000 });
  const addMutation = useMutation({
    mutationFn: createProgressLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myProgress'] }),
  });

  const [form, setForm] = useState({ weight: '', height: '', bodyFat: '' });
  const [error, setError] = useState('');
  const weightRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(form.weight);
    if (!weight || weight <= 0) {
      setError('Enter a valid weight in kg.');
      weightRef.current?.focus();
      return;
    }
    setError('');
    addMutation.mutate({
      weight,
      height: form.height ? parseFloat(form.height) : null,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
    });
    setForm({ weight: '', height: '', bodyFat: '' });
  };

  const change = progress?.weightChange;

  return (
    <>
      <PageHeader title="Progress" description="Track weight, height and body fat over time." />

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Latest weight" value={progress?.latest ? `${progress.latest.weight} kg` : '-'} />
          <StatTile label="BMI" value={progress?.bmi ?? '-'} />
          <StatTile label="Weight change" value={change != null ? `${change > 0 ? '+' : ''}${change} kg` : '-'} />
          <StatTile label="Log entries" value={progress?.entries ?? 0} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <h2 className="font-semibold text-ink">Log your progress</h2>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Weight (kg)" required error={error}>
              <Input ref={weightRef} type="number" step="0.1" min="1" inputMode="decimal" placeholder="72.5" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Height (cm)">
                <Input type="number" step="0.1" min="1" inputMode="decimal" placeholder="175" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </Field>
              <Field label="Body fat (%)">
                <Input type="number" step="0.1" min="1" inputMode="decimal" placeholder="18" value={form.bodyFat} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" className="w-full" loading={addMutation.isPending}>Save entry</Button>
          </form>
        </Card>

        <div>
          <h2 className="mb-3 font-semibold text-ink">History</h2>
          {progress?.logs && progress.logs.length > 0 ? (
            <ul className="space-y-3">
              {progress.logs.map((log) => (
                <li key={log.id}>
                  <Card className="flex items-center justify-between gap-3 !p-4">
                    <div>
                      <p className="font-medium text-ink">
                        {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {[log.bodyFat != null && `Body fat ${log.bodyFat}%`, log.height != null && `Height ${log.height} cm`].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-ink tabular-nums">{log.weight} kg</span>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card><EmptyState icon={TrendingUp} title="No entries yet" description="Add your first weight log." /></Card>
          )}
        </div>
      </div>
    </>
  );
}
