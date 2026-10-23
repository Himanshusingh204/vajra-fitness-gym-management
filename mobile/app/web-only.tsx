import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
import { SITE_URL } from '@/api/session';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/providers/AuthProvider';

export default function WebOnly() {
  const { status, signOut } = useAuth();
  if (status !== 'signedIn') return <Redirect href="/" />;

  return (
    <Screen title="Use the website">
      <Card>
        <Text>Platform administration is only available on the website.</Text>
      </Card>
      <Button label="Open the website" icon="open-outline" onPress={() => Linking.openURL(`${SITE_URL}/login`)} />
      <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
