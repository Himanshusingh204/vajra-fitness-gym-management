import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinGym } from '@/api/gym';
import { Button } from '@/components/Button';
import { Card, StatusPill } from '@/components/Card';
import { GymPicker } from '@/components/GymPicker';
import { Screen } from '@/components/Screen';
import { ErrorState, FormError, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { WorkoutCard } from '@/components/WorkoutCard';
import { useMemberProfile, useMyFees, useMyMemberships, useMyWorkouts } from '@/hooks/useMemberData';
import { daysLeftLabel, daysUntil, formatDate, formatMoney, isOverdue, nextDueFee } from '@/lib/format';
import { useUser } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme';

function JoinGym() {
  const queryClient = useQueryClient();
  const [gymId, setGymId] = useState<string | null>(null);
  const join = useMutation({
    mutationFn: () => joinGym(gymId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member'] }),
  });

  return (
    <Card>
      <Text variant="heading">Join a gym</Text>
      <Text muted>Pick your gym and send a membership request. The gym approves it and sets up your plan.</Text>
      <FormError error={join.error} />
      <GymPicker value={gymId} onChange={setGymId} />
      <Button label="Send request" onPress={() => join.mutate()} disabled={!gymId} loading={join.isPending} />
    </Card>
  );
}

export default function MemberHome() {
  const user = useUser();
  const { colors } = useTheme();
  const profile = useMemberProfile();
  const memberId = profile.data?.id;
  const memberships = useMyMemberships(!!memberId);
  const fees = useMyFees(memberId);
  const workouts = useMyWorkouts(memberId);

  const refreshing = profile.isRefetching || memberships.isRefetching || fees.isRefetching || workouts.isRefetching;
  const refresh = () => {
    profile.refetch();
    if (memberId) {
      memberships.refetch();
      fees.refetch();
      workouts.refetch();
    }
  };

  const firstName = user.username.split(' ')[0];
  let content;

  if (profile.isPending) content = <Loading />;
  else if (profile.isError) content = <ErrorState error={profile.error} onRetry={refresh} />;
  else if (!profile.data) content = <JoinGym />;
  else {
    const current = memberships.data?.[0];
    const days = current ? daysUntil(current.endDate) : null;
    const fee = nextDueFee(fees.data);
    const todays = workouts.data?.find((s) => !s.validUntil || daysUntil(s.validUntil) >= 0);

    content = (
      <>
        {profile.data.status === 'PENDING' && (
          <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
            <Text color={colors.warning}>Waiting for {profile.data.gym.name} to approve your membership.</Text>
          </Card>
        )}

        <Card>
          <View style={styles.between}>
            <Text variant="label" muted>
              Membership
            </Text>
            {current && <StatusPill status={current.lifecycleStatus ?? current.status} />}
          </View>
          {memberships.isPending ? (
            <Loading />
          ) : current ? (
            <>
              <Text variant="heading">{current.plan?.name ?? profile.data.membershipPlan?.name ?? 'Membership'}</Text>
              <Text variant="title" color={days !== null && days <= 7 ? colors.warning : colors.text}>
                {daysLeftLabel(days ?? 0)}
              </Text>
              <Text muted>
                {formatDate(current.startDate)} to {formatDate(current.endDate)}
              </Text>
            </>
          ) : (
            <Text muted>No membership yet. Your gym sets this up once you are approved.</Text>
          )}
        </Card>

        <Card>
          <Text variant="label" muted>
            Next fee
          </Text>
          {fees.isPending ? (
            <Loading />
          ) : fee ? (
            <>
              <Text variant="title">{formatMoney(fee.amount)}</Text>
              <View style={styles.between}>
                <Text muted>Due {formatDate(fee.dueDate)}</Text>
                <StatusPill status={isOverdue(fee) ? 'OVERDUE' : fee.status} />
              </View>
            </>
          ) : (
            <Text muted>Nothing due. You are all paid up.</Text>
          )}
        </Card>

        <View style={styles.section}>
          <Text variant="heading">Today's workout</Text>
          {workouts.isPending ? (
            <Loading />
          ) : todays ? (
            <WorkoutCard slip={todays} />
          ) : (
            <Card>
              <Text muted>No active workout plan. Ask your trainer for one.</Text>
            </Card>
          )}
        </View>
      </>
    );
  }

  return (
    <Screen
      title={`Hi, ${firstName}`}
      subtitle={profile.data?.gym.name}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  section: { gap: space.sm },
});
