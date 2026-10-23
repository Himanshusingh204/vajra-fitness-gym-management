import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle, LifeBuoy, Mail, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { Button, DataTable, EmptyState, IconButton, PageHeader, StatusBadge } from '../../components/ui';
import { dateIN, getPlatformMessages, getTickets, type Ticket } from '../../api/superadmin.api';
import { Panel } from './Panel';

const TICKET_ACTIONS = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' } as const;
const TICKET_TONE = { OPEN: 'info', IN_PROGRESS: 'warning', RESOLVED: 'success', CLOSED: 'neutral' } as const;

export function Tickets() {
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['admin-tickets'], queryFn: getTickets, refetchInterval: 60000 });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/support/tickets/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Support tickets" description="Requests raised by gym owners, trainers and members." />

      <Panel title={`Tickets (${tickets.length})`}>
        <DataTable<Ticket>
          caption="Support tickets"
          loading={isLoading}
          rows={tickets}
          rowKey={(t) => t.id}
          empty={<EmptyState title="No support tickets yet" icon={LifeBuoy} />}
          columns={[
            {
              key: 'from',
              header: 'From',
              cell: (t) => (
                <span className="block text-left">
                  <span className="block font-medium">{t.user?.username}</span>
                  <span className="block break-all text-ink-muted">{t.user?.email}</span>
                </span>
              ),
            },
            {
              key: 'subject',
              header: 'Subject',
              cell: (t) => (
                <span className="block text-left">
                  <span className="block font-medium">{t.subject}</span>
                  <span className="block max-w-64 truncate text-ink-muted">{t.message}</span>
                </span>
              ),
            },
            { key: 'priority', header: 'Priority', cell: (t) => <StatusBadge status={t.priority} tone={PRIORITY_TONE[t.priority as keyof typeof PRIORITY_TONE]} /> },
            { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} tone={TICKET_TONE[t.status as keyof typeof TICKET_TONE]} /> },
            { key: 'created', header: 'Created', cell: (t) => dateIN(t.createdAt) },
            {
              key: 'actions',
              header: 'Set status',
              cell: (t) => (
                <span className="flex flex-wrap justify-end gap-1">
                  {TICKET_ACTIONS.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={t.status === s ? 'primary' : 'secondary'}
                      aria-pressed={t.status === s}
                      disabled={t.status === s || update.isPending}
                      onClick={() => update.mutate({ id: t.id, status: s })}
                    >
                      {s === 'IN_PROGRESS' ? 'In progress' : s === 'RESOLVED' ? 'Resolved' : 'Closed'}
                    </Button>
                  ))}
                </span>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

const MESSAGE_TONE = { NEW: 'info', READ: 'neutral', ARCHIVED: 'neutral' } as const;

export function Messages() {
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useQuery({ queryKey: ['admin-messages'], queryFn: getPlatformMessages, refetchInterval: 60000 });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/messages/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-messages'] }),
  });
  const unread = messages.filter((m) => m.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Contact messages" description="Messages sent through the public contact form." />

      <Panel title={`Messages (${messages.length})`} action={<span className="text-sm text-ink-muted">{unread} new</span>}>
        {isLoading ? (
          <p className="p-6 text-center text-ink-muted">Loading messages</p>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Messages from the contact form show up here." icon={MessageSquare} />
        ) : (
          <ul className="divide-y divide-line">
            {messages.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{m.name}</p>
                    <StatusBadge status={m.status} tone={MESSAGE_TONE[m.status as keyof typeof MESSAGE_TONE]} />
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-ink-muted">
                    <Mail className="size-3.5" aria-hidden="true" /> {m.email}
                    {m.phone && ` · ${m.phone}`}
                  </p>
                  {m.subject && <p className="mt-2 text-sm font-semibold text-ink">{m.subject}</p>}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-muted">{m.message}</p>
                  <p className="mt-2 text-xs text-ink-muted">{new Date(m.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex shrink-0">
                  {m.status !== 'READ' && <IconButton icon={CheckCircle} label="Mark as read" onClick={() => update.mutate({ id: m.id, status: 'READ' })} />}
                  {m.status !== 'ARCHIVED' && <IconButton icon={Archive} label="Archive message" onClick={() => update.mutate({ id: m.id, status: 'ARCHIVED' })} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
