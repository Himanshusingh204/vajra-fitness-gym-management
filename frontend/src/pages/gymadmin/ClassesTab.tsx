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
    BOOKED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    WAITLISTED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    CANCELLED: 'bg-[var(--color-border)] text-[var(--color-muted)]',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-[var(--color-border)] text-[var(--color-muted)]'}`}>
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
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Active Classes</p>
          <p className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)] dark:text-white">{totalClasses}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Capacity</p>
          <p className="text-2xl font-extrabold tabular-nums text-[var(--color-deepgray)] dark:text-white">{totalCapacity}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Bookings</p>
          <p className="text-2xl font-extrabold tabular-nums text-[var(--color-primary)]">{totalBookings}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Create / Edit form */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <h3 className="font-bold text-lg dark:text-white mb-4">{editingClass ? 'Edit Class' : 'Create Class'}</h3>
          <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Yoga" required maxLength={100} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Description</label>
              <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" maxLength={500} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Capacity</label>
              <input className="input-field" type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Duration (min)</label>
              <input className="input-field" type="number" min={1} max={480} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Day of Week</label>
              <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                <option value="">Not scheduled</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{DAY_LABELS_FULL[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Location</label>
              <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Studio 2" maxLength={200} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Start Time</label>
              <input className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="HH:MM" pattern="\d{2}:\d{2}" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">End Time</label>
              <input className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} placeholder="HH:MM" pattern="\d{2}:\d{2}" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Trainer</label>
              {trainers.length > 0 ? (
                <select className="input-field bg-white! dark:bg-[#1a1a1a]!" value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}>
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
              <div className="sm:col-span-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
                {formError}
              </div>
            )}
            {(createMut.isError || updateMut.isError) && (
              <div className="sm:col-span-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
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
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-bold text-lg dark:text-white">Classes ({totalClasses})</h2>
            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden flex-wrap">
              {['ALL', ...DAYS].map((d) => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    dayFilter === d
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-gray-50 dark:hover:bg-white/5'
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
                <div key={i} className="h-16 bg-[var(--color-muted)]/10 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-muted)]">
              {dayFilter === 'ALL' ? 'No classes yet. Create one to get started.' : 'No classes scheduled for this day.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {['Class', 'Schedule', 'Capacity', 'Location', 'Trainer', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {classes.map((cls) => {
                    const booked = cls._count?.bookings ?? 0;
                    const isFull = booked >= cls.capacity;
                    const isExpanded = expandedId === cls.id;
                    return (
                      <Fragment key={cls.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-4 font-semibold dark:text-white">{cls.name}</td>
                          <td className="px-6 py-4 text-[var(--color-muted)]">
                            {cls.dayOfWeek || cls.startTime ? (
                              <div className="flex flex-col gap-0.5">
                                {cls.dayOfWeek && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> {DAY_LABELS_FULL[cls.dayOfWeek] || cls.dayOfWeek}
                                  </span>
                                )}
                                {(cls.startTime || cls.endTime) && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> {cls.startTime || '—'}{cls.endTime ? ` – ${cls.endTime}` : ''}
                                  </span>
                                )}
                              </div>
                            ) : '—'}
                          </td>
                          <td className={`px-6 py-4 font-semibold ${isFull ? 'text-red-500' : 'text-[var(--color-deepgray)] dark:text-white'}`}>
                            {booked} / {cls.capacity}
                          </td>
                          <td className="px-6 py-4 text-[var(--color-muted)]">
                            {cls.location ? (
                              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {cls.location}</span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4 text-[var(--color-muted)]">{cls.trainer?.user.username || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                                aria-label={`${isExpanded ? 'Hide' : 'View'} bookings for ${cls.name}`}
                                title="View bookings"
                                className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:opacity-80"
                              >
                                <Users className="w-4 h-4" />
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <button
                                onClick={() => startEdit(cls)}
                                aria-label={`Edit ${cls.name}`}
                                title="Edit class"
                                className="text-[var(--color-muted)] hover:text-[var(--color-primary)]"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(cls)}
                                aria-label={`Delete ${cls.name}`}
                                title="Delete class"
                                className="text-[var(--color-muted)] hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Bookings for {cls.name}</h4>
                                <button
                                  onClick={() => setExpandedId(null)}
                                  aria-label="Close bookings"
                                  className="text-[var(--color-muted)] hover:text-[var(--color-deepgray)] dark:hover:text-white"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {bookingsLoading ? (
                                <div className="text-sm text-[var(--color-muted)]">Loading…</div>
                              ) : bookings.length === 0 ? (
                                <div className="text-sm text-[var(--color-muted)]">No bookings yet.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr>
                                        {['Member', 'Email', 'Status'].map((h) => (
                                          <th key={h} className="text-left px-3 py-2 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                      {bookings.map((b) => (
                                        <tr key={b.id}>
                                          <td className="px-3 py-2 font-semibold dark:text-white">{b.member.user.username}</td>
                                          <td className="px-3 py-2 text-[var(--color-muted)]">{b.member.user.email}</td>
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
