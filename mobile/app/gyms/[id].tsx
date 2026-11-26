import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { joinGym, listGyms } from '@/api/gym';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ErrorState, FormError, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { useMyGyms } from '@/hooks/useMemberData';
import { formatMoney } from '@/lib/format';
import { openCheckout } from '@/lib/checkout';

export default function GymDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const gyms = useQuery({ queryKey: ['gyms'], queryFn: listGyms, staleTime: 5 * 60_000 });
  const myGyms = useMyGyms();
  const buy = useMutation({
    mutationFn: () => openCheckout(id),
  });

  const join = useMutation({
    mutationFn: () => joinGym(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member'] }),
  });

  if (gyms.isPending) return <Screen edges={['bottom']} scroll={false}><Loading /></Screen>;
  if (gyms.isError) return <Screen edges={['bottom']} scroll={false}><ErrorState error={gyms.error} onRetry={() => gyms.refetch()} /></Screen>;

  const gym = gyms.data.find((g) => g.id === id);
  if (!gym) return <Screen edges={['bottom']} scroll={false}><ErrorState error={new ApiError(404, 'This gym is no longer listed.')} /></Screen>;

  const isMember = !!myGyms.data?.some((g) => g.gymId === id);

  return (
    <Screen edges={['bottom']} title={gym.name} subtitle={`${gym.address}, ${gym.city}`}>
      {gym.tagline ? <Text muted>{gym.tagline}</Text> : null}
      {gym.facilities?.length ? <Text muted>{gym.facilities.join(', ')}</Text> : null}

      <Text variant="heading">Plans</Text>
      <Text muted>Online purchases continue securely on the website. Sign in there to complete your purchase.</Text>
      <FormError error={buy.error} />
      {gym.membershipPlans?.length ? (
        gym.membershipPlans.map((plan) => (
          <Card key={plan.id}>
            <Text variant="label">{plan.name}</Text>
            <Text variant="title">{formatMoney(plan.price)}</Text>
            <Text muted>
              {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
              {plan.description ? `. ${plan.description}` : ''}
            </Text>
            <Button
              label="Buy on website"
              onPress={() => buy.mutate()}
              loading={buy.isPending}
              disabled={buy.isPending}
            />
          </Card>
        ))
      ) : (
        <Text muted>This gym hasn't listed any plans yet. Ask at the front desk.</Text>
      )}

      {isMember ? (
        <Text muted>You are already a member here.</Text>
      ) : (
        <Card>
          <Text variant="heading">Prefer to pay at the gym?</Text>
          <Text muted>Send a membership request. The gym approves it and sets up your plan.</Text>
          <FormError error={join.error} />
          {join.isSuccess ? <Text>Request sent. We will let you know once the gym approves it.</Text> : null}
          <Button label="Send request" variant="secondary" onPress={() => join.mutate()} loading={join.isPending} disabled={join.isSuccess} />
        </Card>
      )}
    </Screen>
  );
}
