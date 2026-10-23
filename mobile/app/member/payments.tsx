import { StyleSheet, View } from 'react-native';
import { Card, ListRow, StatusPill } from '@/components/Card';
import { QueryList } from '@/components/QueryList';
import { Text } from '@/components/Text';
import { useMemberProfile, useMyFees } from '@/hooks/useMemberData';
import { formatDate, formatMoney, isOverdue } from '@/lib/format';
import { space } from '@/theme';

export default function MemberPayments() {
  const profile = useMemberProfile();
  const fees = useMyFees(profile.data?.id);
  const outstanding = (fees.data ?? []).filter((f) => f.status !== 'PAID').reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <QueryList
      title="Payments"
      query={profile.data ? fees : profile}
      items={fees.data}
      keyExtractor={(f) => f.id}
      header={
        fees.data?.length ? (
          <Card>
            <Text variant="label" muted>
              Outstanding
            </Text>
            <Text variant="title">{formatMoney(outstanding)}</Text>
            <Text variant="small" muted>
              Pay at the front desk or online from the website.
            </Text>
          </Card>
        ) : null
      }
      renderItem={(f) => (
        <ListRow
          title={formatMoney(f.amount)}
          subtitle={
            f.status === 'PAID'
              ? `Paid ${formatDate(f.paymentDate)}${f.paymentMethod ? `, ${f.paymentMethod.toLowerCase().replace('_', ' ')}` : ''}`
              : `Due ${formatDate(f.dueDate)}`
          }
          right={
            <View style={styles.pill}>
              <StatusPill status={isOverdue(f) ? 'OVERDUE' : f.status} />
            </View>
          }
        />
      )}
      empty={{ title: 'No payments yet', body: 'Fees your gym records for you appear here.' }}
    />
  );
}

const styles = StyleSheet.create({
  pill: { marginLeft: space.sm },
});
