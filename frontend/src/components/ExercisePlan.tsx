import { Plus, Trash2 } from 'lucide-react';
import { parseExercisePlan, type ExerciseItem } from '../utils/exercisePlan';
import { Button, IconButton, Input } from './ui';

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
      {value.length === 0 && <p className="text-sm text-ink-muted">No exercises added yet.</p>}
      {value.map((item, i) => (
        <div key={i} className="space-y-2 rounded-control border border-line p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">Exercise {i + 1}</span>
            <IconButton icon={Trash2} label={`Remove exercise ${i + 1}`} onClick={() => remove(i)} />
          </div>
          <Input
            aria-label={`Exercise ${i + 1} name`}
            placeholder="Exercise name, e.g. Bench press"
            value={item.exercise}
            onChange={(e) => update(i, { exercise: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label={`Exercise ${i + 1} sets`}
              placeholder="Sets, e.g. 3"
              value={item.sets || ''}
              onChange={(e) => update(i, { sets: e.target.value })}
            />
            <Input
              aria-label={`Exercise ${i + 1} reps`}
              placeholder="Reps, e.g. 10"
              value={item.reps || ''}
              onChange={(e) => update(i, { reps: e.target.value })}
            />
          </div>
          <Input
            aria-label={`Exercise ${i + 1} notes`}
            placeholder="Notes (optional): tempo, rest, form cue"
            value={item.notes || ''}
            onChange={(e) => update(i, { notes: e.target.value })}
          />
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={Plus} onClick={add}>
        Add exercise
      </Button>
    </div>
  );
};

export const ExercisePlanView = ({ exercises, className = '' }: { exercises: string; className?: string }) => {
  const items = parseExercisePlan(exercises);
  if (items.length === 0) return <p className="text-sm text-ink-muted">No exercises listed.</p>;
  return (
    <ol className={`space-y-2.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-ink">
            {i + 1}
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-ink">{item.exercise}</span>
            {(item.sets || item.reps) && (
              <span className="text-ink-muted">
                {', '}
                {[item.sets && `${item.sets} sets`, item.reps && `${item.reps} reps`].filter(Boolean).join(' x ')}
              </span>
            )}
            {item.notes && <p className="mt-0.5 text-xs text-ink-muted">{item.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};
