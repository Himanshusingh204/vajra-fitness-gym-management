import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

export default function AuthLayout() {
  const { status } = useAuth();
  const { colors, reduceMotion } = useTheme();

  if (status === 'signedIn') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: '',
        animation: reduceMotion ? 'none' : 'default',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
