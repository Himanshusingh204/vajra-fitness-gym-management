import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, Users as UsersIcon } from 'lucide-react';
import api from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, DataTable, EmptyState, Input, PageHeader, Select, StatusBadge } from '../../components/ui';
import { dateIN, getAdminUsers, type AdminUser } from '../../api/superadmin.api';
import { Panel } from './Panel';

const ROLES = ['ALL', 'SUPER_ADMIN', 'GYM_ADMIN', 'MEMBER', 'TRAINER', 'STAFF'];
const roleLabel = (role: string) => (role === 'ALL' ? 'All roles' : role.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()));

type Pending = { title: string; message: string; confirmLabel: string; run: () => void };

export default function Users() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers, refetchInterval: 30000 });
  const [role, setRole] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    qc.invalidateQueries({ queryKey: ['admin-audit'] });
  };
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/admin/users/${id}/status`, { isActive }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/users/${id}`), onSuccess: refresh });

  const q = search.trim().toLowerCase();
  const rows = users.filter(
    (u) => (role === 'ALL' || u.role === role) && (!q || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Every account on the platform. Suspend or remove accounts here." />

      <Panel
        title={`Platform users (${rows.length})`}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" placeholder="Search users" className="pl-9" />
            </div>
            <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <DataTable<AdminUser>
          caption="Platform users"
          loading={isLoading}
          rows={rows}
          rowKey={(u) => u.id}
          empty={<EmptyState title="No users match your filters" icon={UsersIcon} />}
          columns={[
            {
              key: 'user',
              header: 'User',
              cell: (u) => (
                <span className="block text-left">
                  <span className="block font-medium">{u.username}</span>
                  <span className="block break-all text-ink-muted">{u.email}</span>
                </span>
              ),
            },
            { key: 'role', header: 'Role', cell: (u) => <StatusBadge status={u.role} tone={u.role === 'SUPER_ADMIN' ? 'info' : 'neutral'} /> },
            {
              key: 'gym',
              header: 'Gym or membership',
              cell: (u) =>
                u.memberDetails ? (
                  <span>
                    {u.memberDetails.gym?.name} <StatusBadge status={u.memberDetails.status} />
                  </span>
                ) : u.ownedGyms?.length ? (
                  u.ownedGyms.map((g) => g.name).join(', ')
                ) : (
                  '-'
                ),
            },
            { key: 'phone', header: 'Phone', cell: (u) => u.phone || '-' },
            { key: 'joined', header: 'Joined', cell: (u) => dateIN(u.createdAt) },
            {
              key: 'actions',
              header: 'Actions',
              cell: (u) => {
                if (u.role === 'SUPER_ADMIN') return '-';
                return (
                  <span className="flex flex-wrap justify-end gap-1">
                    {u.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setPending({
                            title: `Suspend ${u.username}?`,
                            message: 'They will be logged out and blocked from signing in.',
                            confirmLabel: 'Suspend',
                            run: () => setActive.mutate({ id: u.id, isActive: false }),
                          })
                        }
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={setActive.isPending} onClick={() => setActive.mutate({ id: u.id, isActive: true })}>
                        Activate
                      </Button>
                    )}
                    {u.ownedGyms?.length ? (
                      <span className="self-center px-2 text-ink-muted" title="This user owns a gym. Delete the gym instead, which handles the owner account correctly.">
                        Delete via gym
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        disabled={remove.isPending}
                        aria-label={`Delete ${u.username}`}
                        onClick={() =>
                          setPending({
                            title: `Delete ${u.username}?`,
                            message: "This permanently removes the account and all their data. This can't be undone.",
                            confirmLabel: 'Delete',
                            run: () => remove.mutate(u.id),
                          })
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </span>
                );
              },
            },
          ]}
        />
      </Panel>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
