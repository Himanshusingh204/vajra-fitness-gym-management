import { useState } from 'react';
import { Field, Input, Select } from './ui';
import { CM_PER_INCH, LB_PER_KG, inRange } from '../utils/calculators';

type Units = 'metric' | 'imperial';

/** Unit switch plus height and weight fields. Returns the values converted to cm and kg (null while invalid). */
export function useBodyInputs({ height = true }: { height?: boolean } = {}) {
  const [units, setUnits] = useState<Units>('metric');
  const [cm, setCm] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weight, setWeight] = useState('');

  const kg = units === 'metric' ? inRange(weight, 20, 400) : (() => {
    const lb = inRange(weight, 44, 880);
    return lb === null ? null : lb / LB_PER_KG;
  })();

  let heightCm: number | null = null;
  if (units === 'metric') {
    heightCm = inRange(cm, 100, 250);
  } else {
    const ft = inRange(feet, 3, 8);
    const inch = inches === '' ? 0 : inRange(inches, 0, 11.9);
    if (ft !== null && inch !== null) heightCm = (ft * 12 + inch) * CM_PER_INCH;
  }

  const node = (
    <>
      <Field label="Units">
        <Select value={units} onChange={(e) => setUnits(e.target.value as Units)}>
          <option value="metric">Metric (cm, kg)</option>
          <option value="imperial">Imperial (ft, in, lb)</option>
        </Select>
      </Field>
      {height &&
        (units === 'metric' ? (
          <Field label="Height (cm)" hint="Between 100 and 250">
            <Input type="number" inputMode="decimal" value={cm} onChange={(e) => setCm(e.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (ft)" hint="3 to 8">
              <Input type="number" inputMode="numeric" value={feet} onChange={(e) => setFeet(e.target.value)} />
            </Field>
            <Field label="Height (in)" hint="0 to 11">
              <Input type="number" inputMode="decimal" value={inches} onChange={(e) => setInches(e.target.value)} />
            </Field>
          </div>
        ))}
      <Field label={units === 'metric' ? 'Weight (kg)' : 'Weight (lb)'} hint={units === 'metric' ? 'Between 20 and 400' : 'Between 44 and 880'}>
        <Input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </Field>
    </>
  );

  return { node, kg, cm: heightCm, units };
}
