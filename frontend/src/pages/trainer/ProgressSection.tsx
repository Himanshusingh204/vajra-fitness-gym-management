import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { getMemberProgress } from '../../api/progress.api';
import { LineChart } from '../../components/charts';
import { Card, DataTable, EmptyState, Field, PageHeader, Select, Skeleton, StatTile } from '../../components/ui';
import { useGymMembers, useTrainerMe } from './useTrainer';

export default function ProgressSection() {
  const { data: me } = useTrainerMe();
  const { data: members } = useGymMembers(me?.trainerDetails?.gym?.id);
  const [memberId, setMemberId] = useState('');
  const { data: progress, isLoading } = useQuery({
    queryKey: ['memberProgress', memberId],
    queryFn: () => getMemberProgress(memberId),
    enabled: !!memberId,
  });

  const change = progress?.weightChange;

  return (
    <>
      <PageHeader title="Member progress" description="Weight trend and measurement history for a member." />

      <Card>
        <Field label="Member" className="max-w-sm">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Choose a member</option>
            {(members || []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.user?.username}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {!memberId ? (
        <Card><EmptyState icon={TrendingUp} title="Pick a member" description="Choose a member above to see their progress." /></Card>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !progress || progress.entries === 0 ? (
        <Card><EmptyState icon={TrendingUp} title="No entries yet" description="This member has not logged any progress." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Current weight" value={`${progress.latest?.weight ?? '-'} kg`} />
            <StatTile label="BMI" value={progress.bmi ?? '-'} />
            <StatTile label="Change since start" value={change != null ? `${change > 0 ? '+' : ''}${change} kg` : '-'} />
            <StatTile label="Entries logged" value={progress.entries} />
          </div>

          {progress.logs.length >= 2 && (
            <Card>
              <h2 className="mb-4 font-semibold text-ink">Weight trend</h2>
              <div className="h-64">
                <LineChart
                  series={[{
                    name: 'Weight (kg)',
                    data: [...progress.logs].reverse().map((l) => ({
                      label: new Date(l.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                      value: l.weight,
                    })),
                  }]}
                  config={{ height: 240, showArea: true }}
                />
              </div>
            </Card>
          )}

          <Card flush>
            <DataTable
              caption="Measurement history"
              rows={progress.logs}
              rowKey={(l) => l.id}
              columns={[
                { key: 'date', header: 'Date', cell: (l) => new Date(l.date).toLocaleDateString('en-IN') },
                { key: 'weight', header: 'Weight', cell: (l) => `${l.weight} kg` },
                { key: 'height', header: 'Height', cell: (l) => (l.height ? `${l.height} cm` : '-') },
                { key: 'bodyFat', header: 'Body fat', cell: (l) => (l.bodyFat ? `${l.bodyFat}%` : '-') },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
