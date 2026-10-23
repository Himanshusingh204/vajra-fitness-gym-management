import { Fragment, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Clock, Calendar, MapPin, ChevronDown, X } from 'lucide-react';
import api from '../../services/api';
import { getClasses, createClass, updateClass, deleteClass, getClassBookings, type GymClass, type ClassBooking } from '../../api/class.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

// Matches the `dayOfWeek` string values written/read by the backend
// (backend/prisma/schema.prisma: "MONDAY, TUESDAY, etc.").
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};
const DAY_LABELS_FULL: Record<string, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

const TIME_RE = /^\d{2}:\d{2}$/;

type TrainerOption = { id: string; user: { id: string; username: string } };

interface ClassFormState {
  name: string;
  description: string;
  capacity: string;
  duration: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  trainerId: string;
}

interface ClassPayload {
  name: string;
  description: string | null;
  capacity: number;
  duration: number;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  trainerId: string | null;
}

const emptyForm: ClassFormState = {
  name: '', description: '', capacity: '20', duration: '60', dayOfWeek: '', startTime: '', endTime: '', location: '', trainerId: '',
};

const bookingStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    BOOKED: 'bg-success-soft text-success-ink',
    WAITLISTED: 'bg-warning-soft text-warning-ink',
    CANCELLED: 'bg-surface-sunken text-ink-muted',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-surface-sunken text-ink-muted'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

export default function ClassesTab({ gymId }: { gymId: string }) {
  const qc = useQueryClient();

  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GymClass | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery<GymClass[]>({
    queryKey: ['classes', gymId, dayFilter],
    queryFn: () => getClasses(gymId, dayFilter !== 'ALL' ? { day: dayFilter } : undefined),
    enabled: !!gymId,
  });

  // Reuses the same /staff/gym/:gymId endpoint the Team tab already relies on,
  // just to populate a friendly trainer picker instead of a raw UUID field.
  const { data: staffData } = useQuery<{ trainers: TrainerOption[] }>({
    queryKey: ['staff', gymId],
    queryFn: () => api.get(`/staff/gym/${gymId}`).then((r) => r.data),
    enabled: !!gymId,
  });
  const trainers = staffData?.trainers || [];

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<ClassBooking[]>({
    queryKey: ['class-bookings', expandedId],
    queryFn: () => getClassBookings(expandedId as string),
    enabled: !!expandedId,
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingClass(null);
    setFormError(null);
  };

  const buildPayload = (): ClassPayload | null => {
    if (form.startTime && !TIME_RE.test(form.startTime)) {
      setFormError('Start time must be in HH:MM format.');
      return null;
    }
    if (form.endTime && !TIME_RE.test(form.endTime)) {
      setFormError('End time must be in HH:MM format.');
      return null;
    }
    setFormError(null);
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      capacity: Number(form.capacity) || 20,
      duration: Number(form.duration) || 60,
      dayOfWeek: form.dayOfWeek || null,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      location: form.location.trim() || null,
      trainerId: form.trainerId || null,
    };
  };

  const createMut = useMutation({
    mutationFn: (data: ClassPayload) => createClass(gymId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', gymId] });
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassPayload }) => updateClass(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', gymId] });
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes', gymId] });
      setDeleteTarget(null);
    },
  });

  const startEdit = (cls: GymClass) => {
    const matchedTrainer = cls.trainer ? trainers.find((t) => t.user.id === cls.trainer?.user.id) : undefined;
    setEditingClass(cls);
    setForm({
      name: cls.name,
      description: cls.description || '',
      capacity: String(cls.capacity),
      duration: String(cls.duration),
      dayOfWeek: cls.dayOfWeek || '',
      startTime: cls.startTime || '',
      endTime: cls.endTime || '',
      location: cls.location || '',
      trainerId: matchedTrainer?.id || '',
    });
    setFormError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    if (editingClass) {
      updateMut.mutate({ id: editingClass.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const totalClasses = classes.length;
  const totalCapacity = classes.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const totalBookings = classes.reduce((sum, c) => sum + (c._count?.bookings || 0), 0);

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Active classes</p>
          <p className="text-2xl font-extrabold tabular-nums text-ink">{totalClasses}</p>
        </div>
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total capacity</p>
          <p className="text-2xl font-extrabold tabular-nums text-ink">{totalCapacity}</p>
        </div>
        <div className="bg-surface rounded-card p-5 border border-line">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total bookings</p>
          <p className="text-2xl font-extrabold tabular-nums text-accent-ink">{totalBookings}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Create / Edit form */}
        <div className="bg-surface rounded-card border border-line p-6">
          <h3 className="font-bold text-lg mb-4">{editingClass ? 'Edit Class' : 'Create Class'}</h3>
          <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <label htmlFor="classestab-f1" className="block text-sm font-semibold text-ink mb-1.5">Name</label>
              <input id="classestab-f1" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Yoga" required maxLength={100} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="classestab-f2" className="block text-sm font-semibold text-ink mb-1.5">Description</label>
              <input id="classestab-f2" className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" maxLength={500} />
            </div>
            <div>
              <label htmlFor="classestab-f3" className="block text-sm font-semibold text-ink mb-1.5">Capacity</label>
              <input id="classestab-f3" className="input-field" type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="classestab-f4" className="block text-sm font-semibold text-ink mb-1.5">Duration (min)</label>
              <input id="classestab-f4" className="input-field" type="number" min={1} max={480} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="classestab-f5" className="block text-sm font-semibold text-ink mb-1.5">Day of week</label>
              <select id="classestab-f5" className="input-field" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                <option value="">Not scheduled</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{DAY_LABELS_FULL[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="classestab-f6" className="block text-sm font-semibold text-ink mb-1.5">Location</label>
              <input id="classestab-f6" className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Studio 2" maxLength={200} />
            </div>
            <div>
              <label htmlFor="classestab-f7" className="block text-sm font-semibold text-ink mb-1.5">Start time</label>
              <input id="classestab-f7" className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="HH:MM" pattern="\d{2}:\d{2}" />
            </div>
            <div>
              <label htmlFor="classestab-f8" className="block text-sm font-semibold text-ink mb-1.5">End time</label>
              <input id="classestab-f8" className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} placeholder="HH:MM" pattern="\d{2}:\d{2}" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="classes-trainer" className="block text-sm font-semibold text-ink mb-1.5">Trainer</label>
              {trainers.length > 0 ? (
                <select id="classes-trainer" className="input-field" value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user.username}</option>
                  ))}
                </select>
              ) : (
                <input className="input-field" value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} placeholder="Trainer ID (optional)" />
              )}
            </div>

            {formError && (
              <div className="sm:col-span-2 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
                {formError}
              </div>
            )}
            {(createMut.isError || updateMut.isError) && (
              <div className="sm:col-span-2 bg-danger-soft text-danger-ink p-3 rounded-control text-sm border border-danger">
                {(createMut.error as any)?.response?.data?.error || (updateMut.error as any)?.response?.data?.error || 'Failed to save class'}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary justify-center flex-1" disabled={saving || !gymId}>
                {editingClass ? (
                  <>
                    <Pencil className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Class'}
                  </>
                )}
              </button>
              {editingClass && (
                <button type="button" className="btn-outline px-5" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Classes list */}
        <div className="bg-surface rounded-card border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg">Classes ({totalClasses})</h2>
            <div className="flex rounded-control border border-line overflow-hidden flex-wrap">
              {['ALL', ...DAYS].map((d) => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    dayFilter === d
                      ? 'bg-accent text-on-accent'
                      : 'text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {d === 'ALL' ? 'All' : DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {classesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-sunken rounded-control animate-pulse" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center text-ink-muted">
              {dayFilter === 'ALL' ? 'No classes yet. Create one to get started.' : 'No classes scheduled for this day.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    {['Class', 'Schedule', 'Capacity', 'Location', 'Trainer', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {classes.map((cls) => {
                    const booked = cls._count?.bookings ?? 0;
                    const isFull = booked >= cls.capacity;
                    const isExpanded = expandedId === cls.id;
                    return (
                      <Fragment key={cls.id}>
                        <tr className="hover:bg-surface-sunken">
                          <td className="px-6 py-4 font-semibold">{cls.name}</td>
                          <td className="px-6 py-4 text-ink-muted">
                            {cls.dayOfWeek || cls.startTime ? (
                              <div className="flex flex-col gap-0.5">
                                {cls.dayOfWeek && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> {DAY_LABELS_FULL[cls.dayOfWeek] || cls.dayOfWeek}
                                  </span>
                                )}
                                {(cls.startTime || cls.endTime) && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> {cls.startTime || '-'}{cls.endTime ? ` to ${cls.endTime}` : ''}
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className={`px-6 py-4 font-semibold ${isFull ? 'text-danger-ink' : 'text-ink'}`}>
                            {booked} / {cls.capacity}
                          </td>
                          <td className="px-6 py-4 text-ink-muted">
                            {cls.location ? (
                              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {cls.location}</span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-ink-muted">{cls.trainer?.user.username || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                                aria-label={`${isExpanded ? 'Hide' : 'View'} bookings for ${cls.name}`}
                                title="View bookings"
                                className="inline-flex items-center gap-1 text-accent-ink hover:opacity-80"
                              >
                                <Users className="w-4 h-4" />
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <button
                                onClick={() => startEdit(cls)}
                                aria-label={`Edit ${cls.name}`}
                                title="Edit class"
                                className="text-ink-muted hover:text-accent-ink"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(cls)}
                                aria-label={`Delete ${cls.name}`}
                                title="Delete class"
                                className="text-ink-muted hover:text-danger-ink"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-surface-sunken">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Bookings for {cls.name}</h4>
                                <button
                                  onClick={() => setExpandedId(null)}
                                  aria-label="Close bookings"
                                  className="text-ink-muted hover:text-ink"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {bookingsLoading ? (
                                <div className="text-sm text-ink-muted">Loading…</div>
                              ) : bookings.length === 0 ? (
                                <div className="text-sm text-ink-muted">No bookings yet.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr>
                                        {['Member', 'Email', 'Status'].map((h) => (
                                          <th key={h} className="text-left px-3 py-2 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                      {bookings.map((b) => (
                                        <tr key={b.id}>
                                          <td className="px-3 py-2 font-semibold">{b.member.user.username}</td>
                                          <td className="px-3 py-2 text-ink-muted">{b.member.user.email}</td>
                                          <td className="px-3 py-2">{bookingStatusBadge(b.status)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete class"
        message={`Delete "${deleteTarget?.name}"? This can't be undone and any existing bookings will be removed.`}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
