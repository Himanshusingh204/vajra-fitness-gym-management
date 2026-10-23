export const LB_PER_KG = 2.20462;
export const CM_PER_INCH = 2.54;

export const bmiOf = (kg: number, cm: number) => kg / (cm / 100) ** 2;

export type BmiBand = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

// WHO cut-offs, and the lower ones WHO suggests for South Asian adults.
export const bmiBand = (bmi: number, asian: boolean): BmiBand => {
  const [overweight, obese] = asian ? [23, 25] : [25, 30];
  if (bmi < 18.5) return 'Underweight';
  if (bmi < overweight) return 'Normal';
  if (bmi < obese) return 'Overweight';
  return 'Obese';
};

export const healthyWeightRange = (cm: number, asian: boolean): [number, number] => {
  const m2 = (cm / 100) ** 2;
  return [18.5 * m2, (asian ? 22.9 : 24.9) * m2];
};

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Little or no exercise', factor: 1.2 },
  { id: 'light', label: 'Exercise 1 to 3 days a week', factor: 1.375 },
  { id: 'moderate', label: 'Exercise 3 to 5 days a week', factor: 1.55 },
  { id: 'heavy', label: 'Exercise 6 to 7 days a week', factor: 1.725 },
  { id: 'athlete', label: 'Hard daily training or a physical job', factor: 1.9 },
] as const;

// Mifflin-St Jeor basal metabolic rate.
export const bmrOf = (sex: 'male' | 'female', kg: number, cm: number, age: number) =>
  10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);

export const GOALS = [
  { id: 'lose', label: 'Lose weight', delta: -500 },
  { id: 'maintain', label: 'Maintain weight', delta: 0 },
  { id: 'gain', label: 'Gain weight', delta: 300 },
] as const;

export const epley = (weight: number, reps: number) => (reps === 1 ? weight : weight * (1 + reps / 30));
export const brzycki = (weight: number, reps: number) => (reps === 1 ? weight : (weight * 36) / (37 - reps));

export const PROTEIN_GOALS = [
  { id: 'general', label: 'General health, little training', min: 0.8, max: 1.2 },
  { id: 'fitness', label: 'Regular training, staying fit', min: 1.2, max: 1.6 },
  { id: 'muscle', label: 'Building muscle or strength', min: 1.6, max: 2.2 },
  { id: 'cut', label: 'Losing fat while keeping muscle', min: 1.8, max: 2.4 },
] as const;

/** Parses a field value; returns null for empty, non-numeric or out-of-range input. */
export const inRange = (value: string, min: number, max: number) => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null;
};
