import { useQuery } from '@tanstack/react-query';
import { getSlots } from '../../api/booking.api';
import { localDateString } from '../../utils/format';

type Props = {
  trainerId: string;
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
};

// The next seven days, starting today, as YYYY-MM-DD in the viewer's timezone.
const nextDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { value: localDateString(d), weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate() };
  });

export default function SlotPicker({ trainerId, date, time, onChange }: Props) {
  const days = nextDays();
  const { data: slots, isLoading, isError, refetch } = useQuery({
    queryKey: ['slots', trainerId, date],
    queryFn: () => getSlots(trainerId, date),
    enabled: !!trainerId && !!date,
    refetchInterval: 30000,
  });
  const freeCount = slots?.filter((s) => s.available).length ?? 0;

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Pick a day" className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange({ date: d.value, time: '' })}
            aria-pressed={date === d.value}
            className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs font-bold transition-colors ${
              date === d.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-charcoal)] dark:text-white'
            }`}
          >
            <span className="uppercase opacity-80">{d.weekday}</span>
            <span className="text-base">{d.day}</span>
          </button>
        ))}
      </div>

      {!trainerId || !date ? (
        <p className="text-sm text-gray-500">Choose a trainer and a day to see open times.</p>
      ) : isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
          <span>Could not load available times.</span>
          <button type="button" onClick={() => refetch()} className="font-semibold underline underline-offset-2">Try again</button>
        </div>
      ) : freeCount === 0 ? (
        <p className="text-sm text-gray-500">No open times on this day. Try another day.</p>
      ) : (
        <div role="group" aria-label="Pick a time" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots?.map((s) => (
            <button
              key={s.time}
              type="button"
              disabled={!s.available}
              onClick={() => onChange({ date, time: s.time })}
              aria-pressed={time === s.time}
              className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                time === s.time
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : s.available
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-charcoal)] hover:border-[var(--color-primary)] dark:text-white'
                    : 'cursor-not-allowed border-[var(--color-border)] bg-gray-50 text-gray-300 line-through dark:bg-white/5 dark:text-gray-600'
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
