import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { fonts, minTouch, radius, space } from '../theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  password?: boolean;
};

export const Field = forwardRef<ComponentRef<typeof TextInput>, Props>(function Field({ label, error, hint, password, style, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <View style={[styles.box, { borderColor, backgroundColor: colors.surface, borderWidth: focused || error ? 2 : 1 }]}>
        <TextInput
          {...rest}
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && hidden}
          maxFontSizeMultiplier={2}
          style={[styles.input, { color: colors.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="small" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, minHeight: minTouch + 4 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingHorizontal: space.md, paddingVertical: space.sm },
  eye: { minWidth: minTouch, minHeight: minTouch, alignItems: 'center', justifyContent: 'center' },
});
