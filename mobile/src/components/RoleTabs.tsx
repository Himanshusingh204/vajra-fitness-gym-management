import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { Role } from '../api/types';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { fonts } from '../theme';

type Tab = { name: string; title: string; icon: keyof typeof Ionicons.glyphMap };

export function RoleTabs({ role, tabs }: { role: Role; tabs: Tab[] }) {
  const { status, user } = useAuth();
  const { colors, reduceMotion } = useTheme();

  if (status !== 'signedIn' || user?.role !== role) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'shift',
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarAllowFontScaling: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons name={tab.icon} size={size} color={focused ? colors.accent : colors.textMuted} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
