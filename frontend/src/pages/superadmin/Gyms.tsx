import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, DataTable, Dialog, EmptyState, Field, Input, PageHeader, StatusBadge } from '../../components/ui';
import { dateIN, errorMessage, getAdminGyms, type AdminGym } from '../../api/superadmin.api';
import { Panel } from './Panel';

type GymForm = { name: string; address: string; city: string; state: string; gstNumber: string; logoUrl: string; imageUrl: string };
type Pending = { title: string; message: string; confirmLabel: string; destructive: boolean; run: () => void };

const toForm = (g: AdminGym): GymForm => ({
  name: g.name,
  address: g.address ?? '',
  city: g.city,
  state: g.state,
  gstNumber: g.gstNumber ?? '',
  logoUrl: g.logoUrl ?? '',
  imageUrl: g.imageUrl ?? '',
});

export default function Gyms() {
  const qc = useQueryClient();
  const { data: gyms = [], isLoading } = useQuery({ queryKey: ['admin-gyms'], queryFn: getAdminGyms, refetchInterval: 30000 });
  const [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState<AdminGym | null>(null);
  const [form, setForm] = useState<GymForm | null>(null);
  const [deleting, setDeleting] = useState<AdminGym | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const refresh = (withAnalytics = true) => {
    qc.invalidateQueries({ queryKey: ['admin-gyms'] });
    if (withAnalytics) qc.invalidateQueries({ queryKey: ['analytics'] });
    qc.invalidateQueries({ queryKey: ['admin-audit'] });
  };

  const approve = useMutation({ mutationFn: (id: string) => api.put(`/admin/gyms/${id}/approve`), onSuccess: () => refresh() });
  const suspend = useMutation({ mutationFn: (id: string) => api.put(`/admin/gyms/${id}/suspend`), onSuccess: () => refresh() });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/gyms/${id}`),
    onSuccess: () => {
      refresh();
      closeDelete();
    },
  });
  const save = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GymForm }) =>
      api.put(`/admin/gyms/${id}`, {
        ...data,
        name: data.name || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        gstNumber: data.gstNumber || undefined,
        logoUrl: data.logoUrl || undefined,
        imageUrl: data.imageUrl || undefined,
      }),
    onSuccess: () => {
      refresh(false);
      setEditing(null);
    },
  });

  const closeDelete = () => {
    setDeleting(null);
    setConfirmText('');
  };

  const set = (key: keyof GymForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  return (
    <div className="space-y-6">
      <PageHeader title="Gyms" description="Approve new gym partners, edit their details or remove them." />

      <Panel title={`Registered gyms (${gyms.length})`}>
        <DataTable<AdminGym>
          caption="Registered gyms"
          loading={isLoading}
          rows={gyms}
          rowKey={(g) => g.id}
          empty={<EmptyState title="No gyms registered yet" icon={Building2} />}
          columns={[
            { key: 'name', header: 'Gym', cell: (g) => <span className="font-medium">{g.name}</span> },
            { key: 'loc', header: 'Location', cell: (g) => `${g.city}, ${g.state}` },
            { key: 'owner', header: 'Owner', cell: (g) => g.owner?.email ?? '-' },
            { key: 'date', header: 'Registered', cell: (g) => dateIN(g.createdAt) },
            { key: 'status', header: 'Status', cell: (g) => <StatusBadge status={g.isApproved ? 'ACTIVE' : 'PENDING'} /> },
            {
              key: 'actions',
              header: 'Actions',
              cell: (g) => (
                <span className="flex flex-wrap justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Pencil}
                    onClick={() => {
                      setEditing(g);
                      setForm(toForm(g));
                    }}
                  >
                    Edit
                  </Button>
                  {g.isApproved ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={suspend.isPending}
                      onClick={() =>
                        setPending({
                          title: `Suspend "${g.name}"?`,
                          message: 'The gym will lose access to the platform until reactivated.',
                          confirmLabel: 'Suspend',
                          destructive: true,
                          run: () => suspend.mutate(g.id),
                        })
                      }
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={approve.isPending}
                      onClick={() =>
                        setPending({
                          title: `Approve "${g.name}"?`,
                          message: 'The gym owner will be notified and gain full access to the platform.',
                          confirmLabel: 'Approve',
                          destructive: false,
                          run: () => approve.mutate(g.id),
                        })
                      }
                    >
                      Approve
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(g)}>
                    Delete
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit gym details"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="gym-edit-form" loading={save.isPending}>
              Save changes
            </Button>
          </>
        }
      >
        {form && (
          <form
            id="gym-edit-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) save.mutate({ id: editing.id, data: form });
            }}
          >
            <Field label="Name">
              <Input value={form.name} onChange={set('name')} autoComplete="off" />
            </Field>
            <Field label="GST number">
              <Input value={form.gstNumber} onChange={set('gstNumber')} autoComplete="off" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={set('address')} autoComplete="off" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set('city')} autoComplete="off" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={set('state')} autoComplete="off" />
            </Field>
            <Field label="Logo URL">
              <Input value={form.logoUrl} onChange={set('logoUrl')} autoComplete="off" />
            </Field>
            <Field label="Image URL">
              <Input value={form.imageUrl} onChange={set('imageUrl')} autoComplete="off" />
            </Field>
            {save.isError && (
              <p role="alert" className="text-sm font-medium text-danger-ink sm:col-span-2">
                {errorMessage(save.error, 'Could not save the gym.')}
              </p>
            )}
          </form>
        )}
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={closeDelete}
        title={`Permanently delete "${deleting?.name ?? ''}"?`}
        description="This deletes the gym and every record tied to it: members, trainers, staff, fees, bookings, subscriptions, classes and more. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={closeDelete}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={remove.isPending}
              disabled={confirmText !== deleting?.name}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <Field label="Type the gym name to confirm" error={remove.isError ? 'Failed to delete the gym. Please try again.' : undefined}>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={deleting?.name} autoComplete="off" />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel}
        destructive={pending?.destructive}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
