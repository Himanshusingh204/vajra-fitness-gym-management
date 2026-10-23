import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Dumbbell, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../components/ui';
import { FaqList } from '../components/FaqList';
import { usePublicFaqs } from '../hooks/usePublicFaqs';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

type Ticket = { id: string; subject: string; status: string; priority: string; createdAt: string };

const TOPICS = [
  { icon: Dumbbell, title: 'Joining a gym', text: 'How membership requests and approvals work.', to: '/membership' },
  { icon: CreditCard, title: 'Plans and payments', text: 'What gym owners pay and the ways to pay.', to: '/subscription' },
  { icon: UserRound, title: 'Account problems', text: 'Cannot sign in or need your account changed.', to: '/contact' },
];

function TicketForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: '', priority: 'MEDIUM', message: '' });
  const [error, setError] = useState('');

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => api.get<Ticket[]>('/support/my').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/support', form),
    onSuccess: () => {
      setForm({ subject: '', priority: 'MEDIUM', message: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: () => setError('Your ticket was not sent. Please try again.'),
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-bold text-ink">Raise a ticket</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Subject" required>
            <Input value={form.subject} onChange={set('subject')} minLength={3} maxLength={200} />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={set('priority')}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
          <Field label="What happened?" required error={error}>
            <Textarea value={form.message} onChange={set('message')} minLength={5} maxLength={3000} />
          </Field>
          <Button type="submit" loading={create.isPending}>Send ticket</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-lg font-bold text-ink">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-4 text-ink-muted">You have not raised any tickets yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{t.subject}</p>
                  <p className="text-sm text-ink-muted">{new Date(t.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function HelpCenterPage() {
  const faqs = usePublicFaqs();
  const user = useAuthStore((s) => s.user);
  useRouteMeta('/help');

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={pageSeo['/help'].h1} description="Start with the topics below or the questions people ask most." />

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {TOPICS.map(({ icon: Icon, title, text, to }) => (
          <li key={title}>
            <Link to={to} className="block h-full rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <Icon className="size-5 text-accent-ink" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-ink">{title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{text}</p>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-xl font-bold tracking-tight text-ink">Common questions</h2>
      <div className="mt-4">
        <FaqList faqs={faqs} />
      </div>

      <div className="mt-12">
        {user ? (
          <TicketForm />
        ) : (
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink">Need a person? Log in to raise a ticket, or use the contact form if you have no account.</p>
            <div className="flex gap-2">
              <Button to="/login?redirect=/help" variant="secondary">Log in</Button>
              <Button to="/contact">Contact us</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
