import { Redirect } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ErrorState, Loading } from '@/components/States';
import { ApiError } from '@/api/errors';
import { homePath } from '@/lib/roles';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { status, user, retry, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Signing you in" />
      </Screen>
    );
  }

  if (status === 'unreachable') {
    return (
      <Screen scroll={false}>
        <ErrorState error={new ApiError(0, 'offline', 'NETWORK')} onRetry={retry} />
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </Screen>
    );
  }

  if (status === 'signedIn' && user) return <Redirect href={homePath(user)} />;
  return <Redirect href="/welcome" />;
}
