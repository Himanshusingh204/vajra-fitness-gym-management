import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { minTouch, radius, space, type Tone } from '../theme';
import { statusLabel, statusTone } from '../lib/format';
import { Text } from './Text';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>
  );
}

export function StatusPill({ status, tone }: { status: string; tone?: Tone }) {
  const { colors } = useTheme();
  const t = tone ?? statusTone(status);
  const fg = t === 'neutral' ? colors.textMuted : t === 'accent' ? colors.accent : colors[t];
  const bg = t === 'neutral' ? colors.surfaceMuted : t === 'accent' ? colors.accentSoft : colors[`${t}Soft`];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text variant="small" color={fg} style={styles.pillText}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: Tone }) {
  const { colors } = useTheme();
  const color = !tone || tone === 'neutral' ? colors.text : tone === 'accent' ? colors.accent : colors[tone];
  return (
    <Card style={styles.stat}>
      <Text variant="small" muted>
        {label}
      </Text>
      <Text variant="title" color={color}>
        {value}
      </Text>
    </Card>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
};

export function ListRow({ title, subtitle, right, onPress, accessibilityHint }: RowProps) {
  const { colors } = useTheme();
  const body = (
    <>
      <View style={styles.rowText}>
        <Text variant="label" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );
  const rowStyle = [styles.row, { backgroundColor: colors.surface, borderColor: colors.border }];
  if (!onPress) return <View style={rowStyle}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, padding: space.lg, gap: space.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontFamily: 'Outfit_500Medium' },
  stat: { flex: 1, minWidth: 140, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: minTouch + 12,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  rowText: { flex: 1, gap: 2 },
});
