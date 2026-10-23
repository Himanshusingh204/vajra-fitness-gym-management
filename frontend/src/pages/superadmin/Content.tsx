import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Pin, Plus, Star, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Checkbox, Dialog, EmptyState, Field, IconButton, Input, PageHeader, StatusBadge, TabPanel, Tabs, Textarea } from '../../components/ui';
import {
  getFaqs,
  getSiteContent,
  getTestimonials,
  type Faq,
  type SiteContent,
  type Testimonial,
} from '../../api/superadmin.api';
import { Panel } from './Panel';

type Pending = { title: string; message: string; run: () => void };
type AskDelete = (p: Pending) => void;

const TABS = [
  { id: 'faqs', label: 'FAQs' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'site', label: 'Site content' },
];

function ActiveToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Click to hide' : 'Click to show'}
      className="inline-flex min-h-11 cursor-pointer items-center sm:min-h-9"
    >
      <StatusBadge status={active ? 'ACTIVE' : 'hidden'} />
    </button>
  );
}

function FaqSection({ askDelete }: { askDelete: AskDelete }) {
  const qc = useQueryClient();
  const { data: faqs = [], isLoading } = useQuery({ queryKey: ['admin-faqs'], queryFn: getFaqs, refetchInterval: 60000 });
  const [form, setForm] = useState({ question: '', answer: '', category: '' });
  const [editing, setEditing] = useState<Faq | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-faqs'] });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/cms/faqs', data),
    onSuccess: () => {
      refresh();
      setForm({ question: '', answer: '', category: '' });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Faq) => api.put(`/admin/cms/faqs/${id}`, data),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/cms/faqs/${id}`), onSuccess: refresh });

  return (
    <Panel title="FAQs" action={<span className="text-sm text-ink-muted">{faqs.length} items, shown on the Help page</span>}>
      <form
        className="grid gap-3 border-b border-line bg-surface-sunken p-4 sm:p-5 md:grid-cols-[1fr_1.4fr_0.6fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(form);
        }}
      >
        <Field label="Question" required>
          <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        </Field>
        <Field label="Answer" required>
          <Input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <Button type="submit" icon={Plus} loading={create.isPending}>
          Add
        </Button>
      </form>

      {isLoading ? (
        <p className="p-6 text-center text-ink-muted">Loading FAQs</p>
      ) : faqs.length === 0 ? (
        <EmptyState title="No FAQs yet" description="Add the first one above." />
      ) : (
        <ul className="divide-y divide-line">
          {faqs.map((faq) => (
            <li key={faq.id} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{faq.question}</p>
                  {faq.category && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">{faq.category}</span>}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <ActiveToggle active={faq.isActive} onClick={() => update.mutate({ ...faq, isActive: !faq.isActive })} />
                <IconButton icon={Pencil} label={`Edit FAQ: ${faq.question}`} onClick={() => setEditing(faq)} />
                <IconButton
                  icon={Trash2}
                  label={`Delete FAQ: ${faq.question}`}
                  onClick={() =>
                    askDelete({
                      title: 'Delete this FAQ?',
                      message: `"${faq.question}" will be removed from the Help page. This cannot be undone.`,
                      run: () => remove.mutate(faq.id),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit FAQ"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={() => editing && update.mutate(editing)}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Question">
              <Input value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
            </Field>
            <Field label="Answer">
              <Textarea rows={3} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
            </Field>
            <Field label="Category">
              <Input value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
          </div>
        )}
      </Dialog>
    </Panel>
  );
}

const EMPTY_TESTIMONIAL = { name: '', role: '', content: '', gymName: '', rating: 5, featured: false };

function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="group" aria-label="Rating" className="flex">
      {[1, 2, 3, 4, 5].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-label={`${r} star${r > 1 ? 's' : ''}`}
          aria-pressed={r === value}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-control sm:size-9"
        >
          <Star className={r <= value ? 'size-5 fill-warning text-warning' : 'size-5 text-line-strong'} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function TestimonialSection({ askDelete }: { askDelete: AskDelete }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['admin-testimonials'], queryFn: getTestimonials, refetchInterval: 60000 });
  const [form, setForm] = useState(EMPTY_TESTIMONIAL);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-testimonials'] });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/cms/testimonials', data),
    onSuccess: () => {
      refresh();
      setForm(EMPTY_TESTIMONIAL);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: Testimonial) => api.put(`/admin/cms/testimonials/${id}`, data),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/cms/testimonials/${id}`), onSuccess: refresh });

  return (
    <Panel title="Testimonials" action={<span className="text-sm text-ink-muted">{items.length} items</span>}>
      <form
        className="grid gap-3 border-b border-line bg-surface-sunken p-4 sm:p-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(form);
        }}
      >
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Role" hint="For example Gym owner or Trainer" required>
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </Field>
        <Field label="Testimonial" className="md:col-span-2" required>
          <Textarea rows={2} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </Field>
        <Field label="Gym name">
          <Input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
        </Field>
        <Checkbox label="Featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <RatingPicker value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          <Button type="submit" icon={Plus} loading={create.isPending} className="ml-auto">
            Add
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-6 text-center text-ink-muted">Loading testimonials</p>
      ) : items.length === 0 ? (
        <EmptyState title="No testimonials yet" />
      ) : (
        <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id} className="flex flex-col rounded-card border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }, (_, i) => (
                    <Star key={i} className="size-4 fill-warning text-warning" aria-hidden="true" />
                  ))}
                </p>
                {t.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-ink">
                    <Pin className="size-3" aria-hidden="true" /> Featured
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-ink">"{t.content}"</p>
              <p className="mt-3 text-sm font-semibold text-ink">
                {t.name} <span className="font-normal text-ink-muted">{t.role}{t.gymName ? `, ${t.gymName}` : ''}</span>
              </p>
              <div className="-mb-2 mt-1 flex items-center">
                <ActiveToggle active={t.isActive} onClick={() => update.mutate({ ...t, isActive: !t.isActive })} />
                <IconButton icon={Pencil} label={`Edit testimonial by ${t.name}`} className="ml-auto" onClick={() => setEditing(t)} />
                <IconButton
                  icon={Trash2}
                  label={`Delete testimonial by ${t.name}`}
                  onClick={() =>
                    askDelete({
                      title: 'Delete this testimonial?',
                      message: `The testimonial from "${t.name}" will be permanently removed. This cannot be undone.`,
                      run: () => remove.mutate(t.id),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit testimonial"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={() => editing && update.mutate(editing)}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Name">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Role">
              <Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
            </Field>
            <Field label="Testimonial">
              <Textarea rows={3} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            </Field>
            <Field label="Gym name">
              <Input value={editing.gymName ?? ''} onChange={(e) => setEditing({ ...editing, gymName: e.target.value })} />
            </Field>
            <Checkbox label="Featured" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
          </div>
        )}
      </Dialog>
    </Panel>
  );
}

const EMPTY_SITE = { key: '', value: '', section: '', isActive: true };

function SiteContentSection({ askDelete }: { askDelete: AskDelete }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['admin-site-content'], queryFn: getSiteContent, refetchInterval: 60000 });
  const [form, setForm] = useState(EMPTY_SITE);
  const [editing, setEditing] = useState<SiteContent | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-site-content'] });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/cms/site-content', data),
    onSuccess: () => {
      refresh();
      setForm(EMPTY_SITE);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: SiteContent) => api.put(`/admin/cms/site-content/${id}`, data),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/cms/site-content/${id}`), onSuccess: refresh });

  return (
    <Panel title="Site content" action={<span className="text-sm text-ink-muted">{items.length} entries</span>}>
      <form
        className="grid gap-3 border-b border-line bg-surface-sunken p-4 sm:p-5 md:grid-cols-[0.8fr_1.4fr_0.6fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(form);
        }}
      >
        <Field label="Key" required>
          <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </Field>
        <Field label="Value" required>
          <Textarea rows={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </Field>
        <Field label="Section">
          <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
        </Field>
        <Button type="submit" icon={Plus} loading={create.isPending}>
          Add
        </Button>
      </form>

      {isLoading ? (
        <p className="p-6 text-center text-ink-muted">Loading site content</p>
      ) : items.length === 0 ? (
        <EmptyState title="No site content entries yet" description="Add the first one above." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-ink">{c.key}</p>
                  {c.section && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">{c.section}</span>}
                </div>
                <p className="mt-0.5 break-words text-sm text-ink-muted">{c.value}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <ActiveToggle active={c.isActive} onClick={() => update.mutate({ ...c, isActive: !c.isActive })} />
                <IconButton icon={Pencil} label={`Edit site content: ${c.key}`} onClick={() => setEditing(c)} />
                <IconButton
                  icon={Trash2}
                  label={`Delete site content: ${c.key}`}
                  onClick={() =>
                    askDelete({
                      title: 'Delete this site content entry?',
                      message: `"${c.key}" will be permanently removed. This cannot be undone.`,
                      run: () => remove.mutate(c.id),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit site content"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={() => editing && update.mutate(editing)}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Key">
              <Input value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
            </Field>
            <Field label="Value">
              <Textarea rows={3} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
            </Field>
            <Field label="Section">
              <Input value={editing.section ?? ''} onChange={(e) => setEditing({ ...editing, section: e.target.value })} />
            </Field>
          </div>
        )}
      </Dialog>
    </Panel>
  );
}

export default function Content() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as string) : 'faqs';
  const [pending, setPending] = useState<Pending | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader title="Content" description="Help page FAQs, testimonials and editable site text." />
      <Tabs id="cms" label="Content type" items={TABS} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
      <TabPanel tabsId="cms" value={tab}>
        {tab === 'faqs' && <FaqSection askDelete={setPending} />}
        {tab === 'testimonials' && <TestimonialSection askDelete={setPending} />}
        {tab === 'site' && <SiteContentSection askDelete={setPending} />}
      </TabPanel>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel="Delete"
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
