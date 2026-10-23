import { useState } from 'react';
import { Redirect } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import { trainerStatus } from '@/lib/roles';
import { useAuth } from '@/providers/AuthProvider';

export default function AwaitingApproval() {
  const { user, status, reloadUser, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (status !== 'signedIn' || !user || user.role !== 'TRAINER' || trainerStatus(user) === 'ACTIVE') {
    return <Redirect href="/" />;
  }

  const rejected = trainerStatus(user) === 'REJECTED';
  const gym = user.trainerDetails?.gym.name ?? 'the gym';

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      await reloadUser();
    } catch (err) {
      setError(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen title={rejected ? 'Application not approved' : 'Awaiting approval'}>
      <Card>
        <Text>
          {rejected
            ? `${gym} did not approve your trainer application. Contact the gym if you think this is a mistake.`
            : `Thanks for applying. ${gym} reviews new trainers before they can see clients and bookings. You will get access as soon as they approve you.`}
        </Text>
      </Card>
      <FormError error={error} />
      {!rejected && <Button label="Check again" variant="secondary" onPress={check} loading={checking} />}
      <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
