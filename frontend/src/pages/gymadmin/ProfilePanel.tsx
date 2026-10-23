import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useGym } from './GymContext';

export default function ProfilePanel() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const [branchForm, setBranchForm] = useState({
    name: branch.name || '',
    address: branch.address || '',
    city: branch.city || '',
    state: branch.state || '',
    gstNumber: branch.gstNumber || '',
    imageUrl: branch.imageUrl || '',
    facilities: branch.facilities || '',
  });
  const branchUpdate = useMutation({
    mutationFn: (data: typeof branchForm) => api.put('/gym/my-branch', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-branch'] }),
  });

  return (
    <div className="bg-surface rounded-card border border-line p-8 max-w-2xl">
      <h2 className="font-bold text-lg mb-6">Gym details</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          branchUpdate.mutate(branchForm);
        }}
        className="space-y-5"
      >
      <div>
        <label htmlFor="profilepanel-f1" className="block text-sm font-semibold text-ink mb-1.5">Gym name</label>
        <input id="profilepanel-f1" className="input-field" value={branchForm.name} onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))} required />
      </div>
      <div>
        <label htmlFor="profilepanel-f2" className="block text-sm font-semibold text-ink mb-1.5">Address</label>
        <input id="profilepanel-f2" className="input-field" value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="profilepanel-f3" className="block text-sm font-semibold text-ink mb-1.5">City</label>
          <input id="profilepanel-f3" className="input-field" value={branchForm.city} onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))} required />
        </div>
        <div>
          <label htmlFor="profilepanel-f4" className="block text-sm font-semibold text-ink mb-1.5">State</label>
          <input id="profilepanel-f4" className="input-field" value={branchForm.state} onChange={(e) => setBranchForm((p) => ({ ...p, state: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label htmlFor="profilepanel-f5" className="block text-sm font-semibold text-ink mb-1.5">GST Number</label>
        <input id="profilepanel-f5" className="input-field" value={branchForm.gstNumber} onChange={(e) => setBranchForm((p) => ({ ...p, gstNumber: e.target.value }))} placeholder="Optional" />
      </div>
      <div>
        <label htmlFor="profilepanel-f6" className="block text-sm font-semibold text-ink mb-1.5">Cover Image URL</label>
        <input id="profilepanel-f6" className="input-field" value={branchForm.imageUrl} onChange={(e) => setBranchForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://… (shows on the public gym directory)" />
      </div>
      <div>
        <label htmlFor="profilepanel-f7" className="block text-sm font-semibold text-ink mb-1.5">Facilities</label>
        <input id="profilepanel-f7" className="input-field" value={branchForm.facilities} onChange={(e) => setBranchForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Cardio Zone, Free Weights, CrossFit Area" />
      </div>
      <button type="submit" disabled={branchUpdate.isPending} className="btn-primary py-3 px-8">
        {branchUpdate.isPending ? 'Saving…' : 'Save Changes'}
      </button>
      <div aria-live="polite">
        {branchUpdate.isSuccess && (
          <p className="text-success-ink text-sm font-medium">Changes saved successfully.</p>
        )}
      </div>
    </form>
    </div>
  );
}
