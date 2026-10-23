import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useGym } from './GymContext';
import type { Plan } from './types';

export default function PlansPage() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['plans', branch?.id],
    queryFn: () => api.get(`/plans/admin/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [planForm, setPlanForm] = useState({ name: '', description: '', duration: 30, price: 999 });
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const createPlan = useMutation({
    mutationFn: (data: typeof planForm) => api.post('/plans', { ...data, gymId: branch?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); setPlanForm({ name: '', description: '', duration: 30, price: 999 }); },
  });
  const updatePlan = useMutation({
    mutationFn: (data: Plan) => api.put(`/plans/${data.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); setEditingPlan(null); },
  });
  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans', branch?.id] }); qc.invalidateQueries({ queryKey: ['gym-stats', branch?.id] }); },
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="bg-surface rounded-card border border-line p-6">
        <h3 className="font-bold text-lg mb-4">{editingPlan ? 'Edit Plan' : 'Create Membership Plan'}</h3>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingPlan) {
              updatePlan.mutate({ ...editingPlan, name: planForm.name, description: planForm.description, duration: planForm.duration, price: planForm.price });
            } else {
              createPlan.mutate(planForm);
            }
          }}
        >
          <div>
            <label htmlFor="planspage-f1" className="block text-sm font-semibold text-ink mb-1.5">Plan name</label>
            <input id="planspage-f1" className="input-field" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Monthly, Quarterly" required />
          </div>
          <div>
            <label htmlFor="planspage-f2" className="block text-sm font-semibold text-ink mb-1.5">Description</label>
            <input id="planspage-f2" className="input-field" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="What's included" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="planspage-f3" className="block text-sm font-semibold text-ink mb-1.5">Duration (days)</label>
              <input id="planspage-f3" className="input-field" type="number" min={1} value={planForm.duration} onChange={(e) => setPlanForm({ ...planForm, duration: Number(e.target.value) })} required />
            </div>
            <div>
              <label htmlFor="planspage-f4" className="block text-sm font-semibold text-ink mb-1.5">Price (₹)</label>
              <input id="planspage-f4" className="input-field" type="number" min={0} value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={createPlan.isPending || updatePlan.isPending || !branch?.id}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </button>
            {editingPlan && (
              <button type="button" className="btn-outline px-5" onClick={() => { setEditingPlan(null); setPlanForm({ name: '', description: '', duration: 30, price: 999 }); }}>Cancel</button>
            )}
          </div>
          <p className="text-xs text-ink-muted">Plans you publish here appear on the public Membership page for users to join.</p>
        </form>
      </div>

      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex justify-between items-center">
          <h2 className="font-bold text-lg">Current Plans ({plans.length})</h2>
        </div>
        {plansLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : plans.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No plans yet. Create your first one.</div>
        ) : (
          <div className="divide-y divide-line">
            {plans.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink">{p.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-success-soft text-success-ink' : 'bg-surface-sunken text-ink-muted'}`}>{p.isActive ? 'Active' : 'Hidden'}</span>
                  </div>
                  <p className="text-sm text-ink-muted mt-0.5">₹{p.price.toLocaleString('en-IN')} · {p.duration} days{p.description ? ` · ${p.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updatePlan.mutate({ ...p, isActive: !p.isActive })}
                    className="text-xs font-semibold text-ink-muted hover:text-accent-ink px-2 py-1 rounded-control hover:bg-accent-soft"
                  >
                    {p.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => { setEditingPlan(p); setPlanForm({ name: p.name, description: p.description || '', duration: p.duration, price: p.price }); }}
                    className="p-2 rounded-control text-ink-muted hover:text-accent-ink hover:bg-accent-soft"
                    aria-label={`Edit ${p.name} plan`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePlan.mutate(p.id)}
                    className="p-2 rounded-control text-ink-muted hover:text-danger-ink hover:bg-danger-soft"
                    aria-label={`Delete ${p.name} plan`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
