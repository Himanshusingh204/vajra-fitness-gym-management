import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { friendlyMessage } from '../api/errors';
import { useTheme } from '../providers/ThemeProvider';
import { space } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
      <Text style={styles.text} accessibilityRole="alert">
        {friendlyMessage(error)}
      </Text>
      {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} compact />}
    </View>
  );
}

type EmptyProps = {
  title: string;
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({ title, body, icon = 'file-tray-outline' }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text variant="label" style={styles.text}>
        {title}
      </Text>
      {body ? (
        <Text muted style={styles.text}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

// Inline message for form and mutation errors.
export function FormError({ error }: { error: unknown }) {
  const { colors } = useTheme();
  if (!error) return null;
  return (
    <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text color={colors.danger}>{typeof error === 'string' ? error : friendlyMessage(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  text: { textAlign: 'center' },
  banner: { borderRadius: 10, padding: space.md },
});
