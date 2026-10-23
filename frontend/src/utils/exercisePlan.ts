export interface ExerciseItem {
  exercise: string;
  sets?: string;
  reps?: string;
  notes?: string;
}

// WorkoutSlip.exercises is stored as a plain string: either a JSON array of
// ExerciseItem (written by the plan editor) or legacy free text (one exercise
// per line or comma). Parsing both keeps old slips readable without a migration.
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
    // not JSON, fall through to legacy line/comma parsing
  }
  return trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((exercise) => ({ exercise }));
};

export const serializeExercisePlan = (items: ExerciseItem[]): string =>
  JSON.stringify(items.filter((item) => item.exercise.trim()));
