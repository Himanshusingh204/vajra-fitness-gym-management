import { useState } from 'react';
import { ToolLayout, ResultEmpty, ResultNumber } from '../../components/ToolLayout';
import { useBodyInputs } from '../../components/BodyInputs';
import { Checkbox } from '../../components/ui';
import { bmiBand, bmiOf, healthyWeightRange, LB_PER_KG } from '../../utils/calculators';

export default function BmiPage() {
  const body = useBodyInputs();
  const [asian, setAsian] = useState(true);

  const bmi = body.kg !== null && body.cm !== null ? bmiOf(body.kg, body.cm) : null;
  const range = body.cm !== null ? healthyWeightRange(body.cm, asian) : null;
  const fmt = (kg: number) => (body.units === 'metric' ? `${kg.toFixed(1)} kg` : `${(kg * LB_PER_KG).toFixed(0)} lb`);

  return (
    <ToolLayout
      path="/tools/bmi-calculator"
      form={
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {body.node}
          <Checkbox
            checked={asian}
            onChange={(e) => setAsian(e.target.checked)}
            label="Use the lower cut-offs for South Asian adults"
            hint="Overweight starts at 23 and obese at 25 instead of 25 and 30."
          />
        </form>
      }
      result={
        bmi === null ? (
          <ResultEmpty />
        ) : (
          <div className="space-y-5">
            <ResultNumber label="Your BMI" value={bmi.toFixed(1)} />
            <p className="text-lg font-semibold text-ink">{bmiBand(bmi, asian)}</p>
            {range && (
              <p className="text-ink-muted">
                For your height, a BMI in the normal band means a weight of {fmt(range[0])} to {fmt(range[1])}.
              </p>
            )}
          </div>
        )
      }
      notes={
        <>
          <p>BMI is weight divided by height squared. It is a quick screen, not a diagnosis. It cannot tell muscle from fat, so a lifter with a lot of muscle can read as overweight.</p>
          <p>Bands: under 18.5 is underweight. With the standard cut-offs, 18.5 to 24.9 is normal, 25 to 29.9 overweight and 30 or more obese. The South Asian cut-offs bring overweight down to 23 and obese to 25. For children, teenagers and pregnancy these bands do not apply. Talk to a doctor about what your number means for you.</p>
        </>
      }
    />
  );
}
