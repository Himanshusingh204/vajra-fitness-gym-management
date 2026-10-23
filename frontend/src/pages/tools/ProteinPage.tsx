import { useState } from 'react';
import { ToolLayout, ResultEmpty } from '../../components/ToolLayout';
import { useBodyInputs } from '../../components/BodyInputs';
import { Field, Select } from '../../components/ui';
import { PROTEIN_GOALS } from '../../utils/calculators';

export default function ProteinPage() {
  const body = useBodyInputs({ height: false });
  const [goal, setGoal] = useState<(typeof PROTEIN_GOALS)[number]['id']>('fitness');

  const band = PROTEIN_GOALS.find((g) => g.id === goal)!;
  const low = body.kg === null ? null : Math.round(body.kg * band.min);
  const high = body.kg === null ? null : Math.round(body.kg * band.max);

  return (
    <ToolLayout
      path="/tools/protein-calculator"
      form={
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {body.node}
          <Field label="Goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}>
              {PROTEIN_GOALS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </Select>
          </Field>
        </form>
      }
      result={
        low === null || high === null ? (
          <ResultEmpty />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-ink-muted">Daily protein</p>
              <p className="text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                {low} to {high}
                <span className="ml-1 text-lg font-semibold text-ink-muted">g</span>
              </p>
            </div>
            <p className="text-ink-muted">
              That is {band.min} to {band.max} g per kg of body weight. Over four meals it works out to about {Math.round(low / 4)} to {Math.round(high / 4)} g each.
            </p>
          </div>
        )
      }
      notes={
        <>
          <p>The ranges come from sports nutrition guidance: about 0.8 g per kg to avoid deficiency, 1.2 to 1.6 for people who train regularly and 1.6 to 2.2 for building muscle. A slightly higher range helps keep muscle when you are eating fewer calories.</p>
          <p>People with kidney disease and anyone advised to limit protein should follow their doctor, not this estimate.</p>
        </>
      }
    />
  );
}
