import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { getGymNotices, createNotice, updateNotice, deleteNotice } from '../../api/notice.api';
import { useGym } from './GymContext';

export default function NoticesPage() {
  const { gym: branch, confirm: setConfirmAction } = useGym();
  const qc = useQueryClient();
  const { data: notices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ['gymNotices', branch?.id],
    queryFn: () => getGymNotices(branch?.id),
    enabled: !!branch?.id,
    refetchInterval: 30000,
  });

  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' });
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const createNoticeMut = useMutation({
    mutationFn: (data: typeof noticeForm) => createNotice(branch?.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] });
      setNoticeForm({ title: '', content: '' });
    },
  });
  const updateNoticeMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof noticeForm }) => updateNotice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] });
      setEditingNotice(null);
      setNoticeForm({ title: '', content: '' });
    },
  });
  const deleteNoticeMut = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gymNotices', branch?.id] }),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="bg-surface rounded-card border border-line p-6">
        <h3 className="font-bold text-lg mb-4">{editingNotice ? 'Edit Notice' : 'Post Announcement'}</h3>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingNotice) updateNoticeMut.mutate({ id: editingNotice.id, data: noticeForm });
            else createNoticeMut.mutate(noticeForm);
          }}
        >
          <div>
            <label htmlFor="noticespage-f1" className="block text-sm font-semibold text-ink mb-1.5">Title</label>
            <input id="noticespage-f1" className="input-field" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="e.g. Closed on Monday for maintenance" required />
          </div>
          <div>
            <label htmlFor="noticespage-f2" className="block text-sm font-semibold text-ink mb-1.5">Content</label>
            <textarea id="noticespage-f2" className="input-field" rows={5} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} placeholder="What members should know…" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={createNoticeMut.isPending || updateNoticeMut.isPending || !branch?.id}>
              {editingNotice ? 'Save Changes' : 'Publish Notice'}
            </button>
            {editingNotice && (
              <button type="button" className="btn-outline px-5" onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', content: '' }); }}>Cancel</button>
            )}
          </div>
          <div aria-live="polite">
            {createNoticeMut.isError && <p className="text-danger-ink text-sm">{(createNoticeMut.error as any)?.response?.data?.error || 'Failed to publish notice.'}</p>}
          </div>
        </form>
      </div>

      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="font-bold text-lg">Announcements ({notices.length})</h2>
          <p className="text-xs text-ink-muted mt-0.5">Shown to members, trainers and staff on their dashboards.</p>
        </div>
        {noticesLoading ? <div className="p-8 text-center text-ink-muted">Loading…</div> : notices.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No announcements yet.</div>
        ) : (
          <div className="divide-y divide-line max-h-[560px] overflow-y-auto">
            {notices.map((n: any) => (
              <div key={n.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{n.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingNotice(n); setNoticeForm({ title: n.title, content: n.content }); }}
                      className="p-2 rounded-control text-ink-muted hover:text-accent-ink hover:bg-accent-soft"
                      aria-label={`Edit notice: ${n.title}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmAction({
                        title: 'Delete notice',
                        message: `Delete "${n.title}"? This can't be undone.`,
                        onConfirm: () => { deleteNoticeMut.mutate(n.id); setConfirmAction(null); },
                      })}
                      className="p-2 rounded-control text-ink-muted hover:text-danger-ink hover:bg-danger-soft"
                      aria-label={`Delete notice: ${n.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-ink-muted mt-2 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
