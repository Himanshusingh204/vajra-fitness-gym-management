import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Salad, Trash2 } from 'lucide-react';
import { getMyNutritionPlans, createNutritionPlan, deleteNutritionPlan, parseNutritionMeals } from '../../api/nutrition.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Card, EmptyState, Field, IconButton, Input, PageHeader, Skeleton, Textarea } from '../../components/ui';

export default function NutritionSection() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery({ queryKey: ['myNutritionPlans'], queryFn: getMyNutritionPlans, refetchInterval: 60000 });
  const deleteMutation = useMutation({
    mutationFn: deleteNutritionPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myNutritionPlans'] }),
  });
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const [form, setForm] = useState({ title: '', calories: '', meals: '' });
  const [titleError, setTitleError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setTitleError('');
    if (form.title.trim().length < 2) {
      setTitleError('Plan title must be at least 2 characters.');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const meals = form.meals
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...items] = line.split(':');
          return { label: (label || 'Meal').trim(), items: items.join(':').trim() };
        });
      await createNutritionPlan({
        title: form.title.trim(),
        calories: form.calories ? parseInt(form.calories, 10) : null,
        meals: JSON.stringify(meals),
      });
      setForm({ title: '', calories: '', meals: '' });
      queryClient.invalidateQueries({ queryKey: ['myNutritionPlans'] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create nutrition plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nutrition" description="Write your own meal plans and keep them in one place." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <h2 className="font-semibold text-ink">Create a plan</h2>
          <p className="mt-1 text-sm text-ink-muted">Put each meal on its own line, for example: Breakfast: oats and eggs</p>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger-ink">{error}</p>}
            <Field label="Plan title" required error={titleError}>
              <Input ref={titleRef} placeholder="Lean muscle diet" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Daily calories (optional)">
              <Input type="number" min="1" inputMode="numeric" placeholder="2200" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            </Field>
            <Field label="Meals, one per line">
              <Textarea placeholder={'Breakfast: Oats, eggs, banana\nLunch: Rice, dal, vegetables\nDinner: Grilled chicken, salad'} value={form.meals} onChange={(e) => setForm({ ...form, meals: e.target.value })} />
            </Field>
            <Button type="submit" className="w-full" loading={saving}>Create plan</Button>
          </form>
        </Card>

        <div>
          <h2 className="mb-3 font-semibold text-ink">Your plans</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : plans && plans.length > 0 ? (
            <ul className="space-y-4">
              {plans.map((plan) => {
                const meals = parseNutritionMeals(plan.meals);
                return (
                  <li key={plan.id}>
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-ink">{plan.title}</h3>
                          {plan.calories && <p className="text-sm text-ink-muted">{plan.calories} kcal a day</p>}
                        </div>
                        <IconButton icon={Trash2} label={`Delete ${plan.title}`} onClick={() => setToDelete({ id: plan.id, title: plan.title })} />
                      </div>
                      {meals.length > 0 && (
                        <dl className="mt-3 space-y-1.5 text-sm">
                          {meals.map((meal, i) => (
                            <div key={i} className="flex gap-2">
                              <dt className="shrink-0 font-semibold text-accent-ink">{meal.label}</dt>
                              <dd className="text-ink-muted">{meal.items}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Card><EmptyState icon={Salad} title="No nutrition plans yet" description="Create one to track your daily meals." /></Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete nutrition plan?"
        message={toDelete ? `This will permanently delete "${toDelete.title}". This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
