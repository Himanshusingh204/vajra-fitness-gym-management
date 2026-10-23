import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getGymFees } from '@/api/gym';
import { ListRow, StatusPill } from '@/components/Card';
import { QueryList } from '@/components/QueryList';
import { Segmented } from '@/components/Segmented';
import { useWorkGym } from '@/hooks/useWorkGym';
import { formatDate, formatMoney, isOverdue } from '@/lib/format';

export default function PartnerFees() {
  const gymId = useWorkGym();
  const router = useRouter();
  const [filter, setFilter] = useState<'unpaid' | 'overdue'>('unpaid');
  const fees = useQuery({ queryKey: ['gym', gymId, 'fees'], queryFn: () => getGymFees(gymId!), enabled: !!gymId });

  const unpaid = (fees.data ?? []).filter((f) => f.status !== 'PAID');
  const items = (filter === 'overdue' ? unpaid.filter((f) => isOverdue(f)) : unpaid).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
  const total = items.reduce((s, f) => s + Number(f.amount), 0);

  return (
    <QueryList
      title="Fees"
      subtitle={fees.data ? `${items.length} fees, ${formatMoney(total)} outstanding` : undefined}
      query={fees}
      items={fees.data ? items : undefined}
      keyExtractor={(f) => f.id}
      header={
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'unpaid', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
      }
      renderItem={(f) => (
        <ListRow
          title={f.member?.user.username ?? 'Member'}
          subtitle={`${formatMoney(f.amount)}, due ${formatDate(f.dueDate)}`}
          right={<StatusPill status={isOverdue(f) ? 'OVERDUE' : f.status} />}
          onPress={() => router.push({ pathname: '/members/[id]', params: { id: f.memberId } })}
        />
      )}
      empty={{ title: 'Nothing to collect', body: 'Record payments on the website.' }}
    />
  );
}
