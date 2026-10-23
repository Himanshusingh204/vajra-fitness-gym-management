import { describe, expect, it } from 'vitest';
import {
  daysLeftLabel,
  daysUntil,
  formatMoney,
  isOverdue,
  localDateKey,
  nextDueFee,
  parseExercises,
  statusLabel,
} from './format';

describe('formatMoney', () => {
  it('formats Decimal strings in Indian grouping', () => {
    expect(formatMoney('125000.00')).toBe('₹1,25,000');
  });

  it('keeps paise when present', () => {
    expect(formatMoney(499.5)).toBe('₹499.50');
  });

  it('shows a dash for missing or bad values', () => {
    expect(formatMoney(null)).toBe('-');
    expect(formatMoney('abc')).toBe('-');
  });
});

describe('daysUntil', () => {
  const now = new Date(2026, 9, 23, 22, 30);

  it('counts calendar days, ignoring the time of day', () => {
    expect(daysUntil(new Date(2026, 9, 24, 1, 0), now)).toBe(1);
    expect(daysUntil(new Date(2026, 9, 23, 0, 0), now)).toBe(0);
    expect(daysUntil(new Date(2026, 9, 20), now)).toBe(-3);
  });

  it('labels the result', () => {
    expect(daysLeftLabel(0)).toBe('Ends today');
    expect(daysLeftLabel(1)).toBe('1 day left');
    expect(daysLeftLabel(12)).toBe('12 days left');
    expect(daysLeftLabel(-4)).toBe('Ended 4 days ago');
  });
});

describe('fees', () => {
  const fees = [
    { id: 'a', status: 'PAID', dueDate: '2026-09-01' },
    { id: 'b', status: 'PENDING', dueDate: '2026-11-05' },
    { id: 'c', status: 'OVERDUE', dueDate: '2026-10-01' },
  ];

  it('picks the unpaid fee due soonest', () => {
    expect(nextDueFee(fees)?.id).toBe('c');
    expect(nextDueFee([])).toBeUndefined();
    expect(nextDueFee(undefined)).toBeUndefined();
  });

  it('treats a pending fee past its due date as overdue', () => {
    const now = new Date(2026, 10, 10);
    expect(isOverdue({ status: 'PENDING', dueDate: '2026-11-05' }, now)).toBe(true);
    expect(isOverdue({ status: 'PAID', dueDate: '2026-11-05' }, now)).toBe(false);
  });
});

describe('small helpers', () => {
  it('builds a local date key', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('turns enum values into sentence case', () => {
    expect(statusLabel('GRACE_PERIOD')).toBe('Grace period');
  });
});

describe('parseExercises', () => {
  it('reads the JSON format', () => {
    expect(parseExercises('[{"exercise":"Squat","sets":"3","reps":10}]')).toEqual([
      { exercise: 'Squat', sets: '3', reps: '10', notes: '' },
    ]);
  });

  it('reads legacy free text', () => {
    expect(parseExercises('Bench press\nRows, Plank')).toEqual([
      { exercise: 'Bench press' },
      { exercise: 'Rows' },
      { exercise: 'Plank' },
    ]);
  });
});
