import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { space } from '@/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Vajra Fitness logo"
        />
        <Text variant="title" style={styles.center}>
          Vajra Fitness
        </Text>
        <Text muted style={styles.center}>
          Your membership, workouts, attendance and fees in one place. Sign in with the account you use on the website.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Sign in" onPress={() => router.push('/login')} />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/register')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xxl },
  logo: { width: 112, height: 112 },
  center: { textAlign: 'center' },
  actions: { gap: space.md },
});
