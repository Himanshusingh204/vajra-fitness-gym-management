import type { ReactElement, ReactNode } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTheme } from '../providers/ThemeProvider';
import { maxContentWidth, space } from '../theme';
import { EmptyState, ErrorState, Loading } from './States';
import { Text } from './Text';

type Props<T> = {
  query: UseQueryResult<unknown>;
  items: T[] | undefined;
  renderItem: (item: T) => ReactElement;
  keyExtractor: (item: T) => string;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  empty: { title: string; body?: string };
  edges?: Edge[];
};

export function QueryList<T>({ query, items, renderItem, keyExtractor, title, subtitle, header, empty, edges = ['top'] }: Props<T>) {
  const { colors } = useTheme();

  const top = (
    <View style={styles.top}>
      {title ? (
        <View style={styles.heading}>
          <Text variant="title">{title}</Text>
          {subtitle ? <Text muted>{subtitle}</Text> : null}
        </View>
      ) : null}
      {header}
    </View>
  );

  let fallback: ReactElement | null = null;
  if (query.isPending) fallback = <Loading />;
  else if (query.isError && !items?.length) fallback = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  else fallback = <EmptyState title={empty.title} body={empty.body} />;

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.isPending ? [] : (items ?? [])}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <View style={styles.item}>{renderItem(item)}</View>}
        ListHeaderComponent={top}
        ListEmptyComponent={fallback}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
    </SafeAreaView>
  );
}

const column = { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' } as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingVertical: space.lg, flexGrow: 1 },
  top: { ...column, gap: space.lg, marginBottom: space.md },
  heading: { gap: space.xs },
  item: { ...column, marginBottom: space.sm },
});
