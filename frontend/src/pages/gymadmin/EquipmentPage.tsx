import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { getEquipment, addEquipment, deleteEquipment } from '../../api/equipment.api';
import { useGym } from './GymContext';

export default function EquipmentPage() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', branch?.id],
    queryFn: () => getEquipment(branch?.id),
    enabled: !!branch?.id,
  });
  const [equipForm, setEquipForm] = useState({ name: '', serialNumber: '', purchaseDate: '', purchaseCost: 0, warrantyExpiry: '', location: '', condition: 'GOOD', notes: '' });
  const addEquipMut = useMutation({
    mutationFn: (data: typeof equipForm) => addEquipment(branch?.id, { ...data, purchaseCost: Number(data.purchaseCost) || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment', branch?.id] }); setEquipForm({ name: '', serialNumber: '', purchaseDate: '', purchaseCost: 0, warrantyExpiry: '', location: '', condition: 'GOOD', notes: '' }); },
  });
  const deleteEquipMut = useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment', branch?.id] }),
  });

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-card border border-line p-8">
        <h2 className="font-bold text-lg mb-4">Equipment</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total equipment</p>
            <p className="text-2xl font-extrabold text-accent-ink">{equipment.length}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Good condition</p>
            <p className="text-2xl font-extrabold text-success-ink">{equipment.filter((e: any) => e.condition === 'EXCELLENT' || e.condition === 'GOOD').length}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Needs repair</p>
            <p className="text-2xl font-extrabold text-warning-ink">{equipment.filter((e: any) => e.condition === 'FAIR' || e.condition === 'POOR').length}</p>
          </div>
          <div className="rounded-card border border-line p-5 bg-surface-sunken">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total value</p>
            <p className="text-2xl font-extrabold text-info-ink">₹{equipment.reduce((s: number, e: any) => s + (e.purchaseCost || 0), 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); addEquipMut.mutate(equipForm); }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <input className="input-field" placeholder="Equipment name" value={equipForm.name} onChange={(e) => setEquipForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="input-field" placeholder="Serial number" value={equipForm.serialNumber} onChange={(e) => setEquipForm((p) => ({ ...p, serialNumber: e.target.value }))} />
          <input className="input-field" type="number" placeholder="Purchase cost" value={equipForm.purchaseCost || ''} onChange={(e) => setEquipForm((p) => ({ ...p, purchaseCost: Number(e.target.value) }))} />
          <input className="input-field" type="date" placeholder="Purchase date" value={equipForm.purchaseDate} onChange={(e) => setEquipForm((p) => ({ ...p, purchaseDate: e.target.value }))} />
          <input className="input-field" placeholder="Location" value={equipForm.location} onChange={(e) => setEquipForm((p) => ({ ...p, location: e.target.value }))} />
          <select className="input-field" value={equipForm.condition} onChange={(e) => setEquipForm((p) => ({ ...p, condition: e.target.value }))}>
            {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <button type="submit" disabled={addEquipMut.isPending} className="btn-primary py-2">{addEquipMut.isPending ? 'Adding…' : 'Add Equipment'}</button>
        </form>
        {equipmentLoading ? (
          <div className="h-32 bg-surface-sunken rounded-control animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Name', 'Serial', 'Condition', 'Location', 'Value', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {equipment.map((eq: any) => (
                  <tr key={eq.id} className="hover:bg-surface-sunken">
                    <td className="px-6 py-3 font-semibold">{eq.name}</td>
                    <td className="px-6 py-3 text-ink-muted">{eq.serialNumber || '-'}</td>
                    <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${eq.condition === 'EXCELLENT' || eq.condition === 'GOOD' ? 'bg-success-soft text-success-ink' : eq.condition === 'FAIR' ? 'bg-warning-soft text-warning-ink' : 'bg-danger-soft text-danger-ink'}`}>{eq.condition}</span></td>
                    <td className="px-6 py-3 text-ink-muted">{eq.location || '-'}</td>
                    <td className="px-6 py-3 font-semibold">₹{(eq.purchaseCost || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3">
                      <button onClick={() => deleteEquipMut.mutate(eq.id)} className="text-danger-ink hover:text-danger-ink" aria-label={`Delete ${eq.name}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
