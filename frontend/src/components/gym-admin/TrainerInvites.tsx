import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, X } from 'lucide-react';
import { getTrainerInvites, inviteTrainer, revokeTrainerInvite } from '../../api/trainerInvite.api';
import { useNotificationStore } from '../../store/useNotificationStore';

const TrainerInvites = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const { data: invites = [] } = useQuery({ queryKey: ['trainer-invites'], queryFn: getTrainerInvites });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['trainer-invites'] });
  const failed = (err: any) => addNotification('error', err.response?.data?.error || 'Something went wrong.');

  const invite = useMutation({
    mutationFn: inviteTrainer,
    onSuccess: () => {
      addNotification('success', `Invitation sent to ${email}.`);
      setEmail('');
      setName('');
      refresh();
    },
    onError: failed,
  });
  const revoke = useMutation({ mutationFn: revokeTrainerInvite, onSuccess: refresh, onError: failed });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate({ email, ...(name.trim() ? { name: name.trim() } : {}) });
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
      <h3 className="font-bold text-lg dark:text-white mb-1">Invite a trainer</h3>
      <p className="text-sm text-gray-500 mb-4">They get an email link to set a password and join straight away, no approval needed.</p>
      <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end" onSubmit={submit}>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="invite-email">Email</label>
          <input id="invite-email" className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="invite-trainer-name">Name (optional)</label>
          <input id="invite-trainer-name" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary justify-center" disabled={invite.isPending}>
          <Send className="w-4 h-4" /> Send invite
        </button>
      </form>

      {invites.length > 0 && (
        <ul className="mt-5 divide-y divide-gray-100 dark:divide-white/5">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="dark:text-white">
                {i.name ? `${i.name} · ` : ''}{i.email}
                <span className="text-xs text-gray-400"> · expires {new Date(i.expiresAt).toLocaleDateString()}</span>
              </span>
              <button type="button" className="text-red-600 hover:underline inline-flex items-center gap-1" onClick={() => revoke.mutate(i.id)} disabled={revoke.isPending}>
                <X className="w-3.5 h-3.5" /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TrainerInvites;
