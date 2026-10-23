import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { minTouch, radius, space } from '../theme';
import { Text } from './Text';

type Props<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected, checked: selected }}
            style={[styles.option, selected && { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text variant="label" color={selected ? colors.text : colors.textMuted} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radius.control, padding: 3, gap: 3 },
  option: {
    flex: 1,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control - 3,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: space.sm,
  },
});
