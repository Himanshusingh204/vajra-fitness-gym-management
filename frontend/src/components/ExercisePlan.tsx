import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface ExerciseItem {
  exercise: string;
  sets?: string;
  reps?: string;
  notes?: string;
}

// WorkoutSlip.exercises is stored as a plain string — either a JSON array of
// ExerciseItem (written by this editor) or legacy free text (one exercise per
// line/comma, written before this editor existed). Parsing both keeps old
// slips readable without a migration.
export const parseExercisePlan = (raw: string): ExerciseItem[] => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === 'string'
          ? { exercise: item }
          : {
              exercise: item?.exercise || '',
              sets: item?.sets || '',
              reps: item?.reps || '',
              notes: item?.notes || '',
            }
      );
    }
  } catch {
    // not JSON — fall through to legacy line/comma parsing
  }
  return trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((exercise) => ({ exercise }));
};

export const serializeExercisePlan = (items: ExerciseItem[]): string =>
  JSON.stringify(items.filter((item) => item.exercise.trim()));

export const ExercisePlanEditor = ({
  value,
  onChange,
}: {
  value: ExerciseItem[];
  onChange: (items: ExerciseItem[]) => void;
}) => {
  const update = (index: number, patch: Partial<ExerciseItem>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { exercise: '', sets: '', reps: '', notes: '' }]);

  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-sm text-gray-400 italic">No exercises added yet.</p>}
      {value.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Exercise {i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove exercise ${i + 1}`}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            className="input-field py-2! text-sm"
            placeholder="Exercise name (e.g. Bench Press)"
            value={item.exercise}
            onChange={(e) => update(i, { exercise: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field py-2! text-sm"
              placeholder="Sets (e.g. 3)"
              value={item.sets || ''}
              onChange={(e) => update(i, { sets: e.target.value })}
            />
            <input
              className="input-field py-2! text-sm"
              placeholder="Reps (e.g. 10)"
              value={item.reps || ''}
              onChange={(e) => update(i, { reps: e.target.value })}
            />
          </div>
          <input
            className="input-field py-2! text-sm"
            placeholder="Notes (optional) — e.g. tempo, rest, form cue"
            value={item.notes || ''}
            onChange={(e) => update(i, { notes: e.target.value })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
      >
        <Plus className="w-4 h-4" /> Add exercise
      </button>
    </div>
  );
};

export const ExercisePlanView = ({ exercises, className = '' }: { exercises: string; className?: string }) => {
  const items = parseExercisePlan(exercises);
  if (items.length === 0) return <p className="text-sm text-gray-400 italic">No exercises listed.</p>;
  return (
    <ol className={`space-y-2.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            {i + 1}
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-[var(--color-deepgray)] dark:text-white">{item.exercise}</span>
            {(item.sets || item.reps) && (
              <span className="text-gray-500 dark:text-gray-400">
                {' — '}
                {[item.sets && `${item.sets} sets`, item.reps && `${item.reps} reps`].filter(Boolean).join(' × ')}
              </span>
            )}
            {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};
