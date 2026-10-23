import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { maxContentWidth, space } from '../theme';
import { Text } from './Text';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  // Screens inside a stack with a header do not need the top inset.
  edges?: Edge[];
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ children, title, subtitle, edges = ['top'], scroll = true, refreshing, onRefresh }: Props) {
  const { colors } = useTheme();

  const header = title ? (
    <View style={styles.header}>
      <Text variant="title">{title}</Text>
      {subtitle ? <Text muted>{subtitle}</Text> : null}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
              ) : undefined
            }
          >
            <View style={styles.column}>
              {header}
              {children}
            </View>
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.column, styles.fixed]}>
            {header}
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.lg, paddingVertical: space.lg },
  fixed: { paddingHorizontal: space.lg, paddingTop: space.lg },
  column: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', gap: space.lg },
  header: { gap: space.xs },
});
