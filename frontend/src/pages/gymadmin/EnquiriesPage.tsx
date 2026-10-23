import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useGym } from './GymContext';

export default function EnquiriesPage() {
  const { gym: branch } = useGym();
  const qc = useQueryClient();
  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ['enquiries', branch?.id],
    queryFn: () => api.get(`/enquiries/gym/${branch?.id}`).then((r) => r.data),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const updateEnquiry = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/enquiries/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries', branch?.id] }),
  });

  return (
    <div className="bg-surface rounded-card border border-line overflow-hidden">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="font-bold text-lg">Enquiries</h2>
      </div>
      {enquiriesLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken">
              <tr>
                {['Name', 'Phone', 'Email', 'Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {enquiries.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-muted">No enquiries yet.</td></tr>
              ) : enquiries.map((e: any) => (
                <tr key={e.id} className="hover:bg-surface-sunken">
                  <td className="px-6 py-4 font-semibold">{e.name}</td>
                  <td className="px-6 py-4 text-ink-muted">{e.phone}</td>
                  <td className="px-6 py-4 text-ink-muted">{e.email || '-'}</td>
                  <td className="px-6 py-4 text-ink-muted">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      e.status === 'CONVERTED' ? 'bg-success-soft text-success-ink' :
                      e.status === 'CLOSED' ? 'bg-surface-sunken text-ink-muted' :
                      'bg-info-soft text-info-ink'
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {e.status !== 'CONVERTED' && (
                        <button
                          onClick={() => updateEnquiry.mutate({ id: e.id, status: 'CONVERTED' })}
                          className="inline-flex items-center gap-1 text-success-ink hover:text-success-ink font-semibold text-xs hover:underline"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Converted
                        </button>
                      )}
                      {e.status !== 'CLOSED' && (
                        <button
                          onClick={() => updateEnquiry.mutate({ id: e.id, status: 'CLOSED' })}
                          className="inline-flex items-center gap-1 text-ink-muted hover:text-ink font-semibold text-xs hover:underline"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
