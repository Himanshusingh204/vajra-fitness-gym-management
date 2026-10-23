import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button } from '@/components/Button';
import { Card, ListRow } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { SITE_URL } from '@/api/session';

// The partner flow (gym details, GST, plan) stays on the website.
const partnerSignupUrl = `${SITE_URL}/register/partner`;

export default function RegisterChooser() {
  const router = useRouter();

  return (
    <Screen title="Create an account" subtitle="Who are you joining as?" edges={['bottom']}>
      <ListRow
        title="Member"
        subtitle="Join a gym, see your plan, workouts, attendance and fees."
        onPress={() => router.push('/register-member')}
      />
      <ListRow
        title="Trainer"
        subtitle="Apply to train at a gym. The gym approves your account."
        onPress={() => router.push('/register-trainer')}
      />
      <Card>
        <Text variant="label">Own a gym?</Text>
        <Text muted>Partner accounts are set up on the website, where you add your gym details and start the free trial.</Text>
        <Button
          label="Register your gym on the website"
          variant="secondary"
          icon="open-outline"
          accessibilityHint="Opens the website in your browser"
          onPress={() => Linking.openURL(partnerSignupUrl)}
        />
      </Card>
    </Screen>
  );
}
