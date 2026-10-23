import { useState } from 'react';
import { ToolLayout, ResultEmpty, ResultNumber } from '../../components/ToolLayout';
import { useBodyInputs } from '../../components/BodyInputs';
import { Field, Input, Select } from '../../components/ui';
import { ACTIVITY_LEVELS, GOALS, bmrOf, inRange } from '../../utils/calculators';

export default function CaloriePage() {
  const body = useBodyInputs();
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [activity, setActivity] = useState<(typeof ACTIVITY_LEVELS)[number]['id']>('light');
  const [goal, setGoal] = useState<(typeof GOALS)[number]['id']>('maintain');

  const years = inRange(age, 15, 90);
  const { kg, cm } = body;
  const bmr = kg !== null && cm !== null && years !== null ? bmrOf(sex, kg, cm, years) : null;
  const factor = ACTIVITY_LEVELS.find((a) => a.id === activity)!.factor;
  const maintenance = bmr === null ? null : bmr * factor;
  const target = maintenance === null ? null : maintenance + GOALS.find((g) => g.id === goal)!.delta;
  const floor = sex === 'male' ? 1500 : 1200;
  const round = (n: number) => Math.round(n).toLocaleString('en-IN');

  return (
    <ToolLayout
      path="/tools/calorie-calculator"
      form={
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Sex used in the formula">
            <Select value={sex} onChange={(e) => setSex(e.target.value as 'male' | 'female')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </Field>
          <Field label="Age (years)" hint="Between 15 and 90">
            <Input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          {body.node}
          <Field label="Activity">
            <Select value={activity} onChange={(e) => setActivity(e.target.value as typeof activity)}>
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}>
              {GOALS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </Select>
          </Field>
        </form>
      }
      result={
        target === null || maintenance === null || bmr === null ? (
          <ResultEmpty />
        ) : (
          <div className="space-y-5">
            <ResultNumber label="Daily target" value={round(target)} unit="kcal" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-muted">Maintenance</dt>
                <dd className="text-lg font-bold text-ink tabular-nums">{round(maintenance)} kcal</dd>
              </div>
              <div>
                <dt className="text-ink-muted">At rest (BMR)</dt>
                <dd className="text-lg font-bold text-ink tabular-nums">{round(bmr)} kcal</dd>
              </div>
            </dl>
            {target < floor && (
              <p role="alert" className="rounded-control bg-warning-soft px-3 py-2 text-sm font-medium text-warning-ink">
                This is below {floor.toLocaleString('en-IN')} kcal. Eating that little is not advised without a doctor or dietitian watching.
              </p>
            )}
          </div>
        )
      }
      notes={
        <>
          <p>This uses the Mifflin-St Jeor equation for your resting energy, then multiplies it by an activity factor to get the calories you burn in a day. Losing weight takes off 500 kcal, which is roughly 0.5 kg a week. Gaining adds 300.</p>
          <p>It is an estimate. Real needs vary by 10 to 15 percent between people, so track your weight for two or three weeks and adjust.</p>
        </>
      }
    />
  );
}
