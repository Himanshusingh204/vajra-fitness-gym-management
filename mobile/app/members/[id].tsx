import { Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { getMember, getMemberFees } from '@/api/gym';
import { Button } from '@/components/Button';
import { Card, ListRow, StatusPill } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { formatDate, formatMoney, isOverdue } from '@/lib/format';

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useQuery({ queryKey: ['member-detail', id], queryFn: () => getMember(id) });
  const fees = useQuery({ queryKey: ['member', 'fees', id], queryFn: () => getMemberFees(id) });

  const refresh = () => {
    member.refetch();
    fees.refetch();
  };

  if (member.isPending) return <Screen edges={['bottom']} scroll={false}><Loading /></Screen>;
  if (member.isError) return <Screen edges={['bottom']} scroll={false}><ErrorState error={member.error} onRetry={refresh} /></Screen>;

  const m = member.data;
  return (
    <Screen edges={['bottom']} refreshing={member.isRefetching || fees.isRefetching} onRefresh={refresh}>
      <Card>
        <Text variant="heading">{m.user.username}</Text>
        <StatusPill status={m.status} />
        {m.user.email ? <Text muted>{m.user.email}</Text> : null}
        <Text muted>Plan: {m.membershipPlan?.name ?? 'None'}</Text>
        <Text muted>Joined {formatDate(m.joiningDate)}</Text>
        {m.user.phone ? (
          <Button label={`Call ${m.user.phone}`} variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:${m.user.phone}`)} />
        ) : null}
      </Card>
      <Text variant="heading">Fees</Text>
      {fees.isPending ? (
        <Loading />
      ) : fees.isError ? (
        <ErrorState error={fees.error} onRetry={() => fees.refetch()} />
      ) : fees.data.length === 0 ? (
        <Text muted>No fees recorded.</Text>
      ) : (
        fees.data.map((f) => (
          <ListRow
            key={f.id}
            title={formatMoney(f.amount)}
            subtitle={f.status === 'PAID' ? `Paid ${formatDate(f.paymentDate)}` : `Due ${formatDate(f.dueDate)}`}
            right={<StatusPill status={isOverdue(f) ? 'OVERDUE' : f.status} />}
          />
        ))
      )}
    </Screen>
  );
}
