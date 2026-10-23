import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { type as typeScale } from '../theme';

type Props = TextProps & {
  variant?: keyof typeof typeScale;
  muted?: boolean;
  color?: string;
};

export function Text({ variant = 'body', muted, color, style, ...rest }: Props) {
  const { colors } = useTheme();
  const role = variant === 'title' || variant === 'heading' ? 'header' : undefined;
  return (
    <RNText
      accessibilityRole={role}
      maxFontSizeMultiplier={2}
      style={[typeScale[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
      {...rest}
    />
  );
}
