import { useState } from 'react';
import { ToolLayout, ResultEmpty, ResultNumber } from '../../components/ToolLayout';
import { Field, Input, Select } from '../../components/ui';
import { brzycki, epley, inRange } from '../../utils/calculators';

const PERCENTAGES = [95, 90, 85, 80, 75, 70, 65, 60, 50];

export default function OneRepMaxPage() {
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const w = inRange(weight, 1, 1000);
  const r = inRange(reps, 1, 12);
  const valid = w !== null && r !== null && Number.isInteger(r);
  const max = valid ? (epley(w, r) + brzycki(w, r)) / 2 : null;
  const step = unit === 'kg' ? 2.5 : 5;
  // Plates only come in steps, so round working weights to the nearest one.
  const loadable = (n: number) => (Math.round(n / step) * step).toString();

  return (
    <ToolLayout
      path="/tools/one-rep-max-calculator"
      form={
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}>
              <option value="kg">Kilograms</option>
              <option value="lb">Pounds</option>
            </Select>
          </Field>
          <Field label={`Weight lifted (${unit})`}>
            <Input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Reps completed" hint="Whole number from 1 to 12. Estimates are most accurate under 10.">
            <Input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </Field>
        </form>
      }
      result={
        max === null ? (
          <ResultEmpty />
        ) : (
          <div className="space-y-5">
            <ResultNumber label="Estimated one-rep max" value={(Math.round(max * 10) / 10).toString()} unit={unit} />
            <table className="w-full text-sm">
              <caption className="pb-2 text-left font-medium text-ink-muted">Working weights</caption>
              <thead className="sr-only">
                <tr><th scope="col">Percent of max</th><th scope="col">Weight</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PERCENTAGES.map((p) => (
                  <tr key={p}>
                    <th scope="row" className="py-1.5 text-left font-medium text-ink">{p}%</th>
                    <td className="py-1.5 text-right tabular-nums text-ink">{loadable((max * p) / 100)} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      notes={
        <>
          <p>The estimate is the average of the Epley and Brzycki formulas, which both predict a single-rep maximum from a lighter set. Working weights are rounded to {step} {unit} so they can be loaded on a bar.</p>
          <p>Treat the result as a starting point. Fatigue, sleep and technique move your real max from day to day. Test a true one-rep max only with a spotter and after a proper warm-up.</p>
        </>
      }
    />
  );
}
