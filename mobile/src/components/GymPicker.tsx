import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { listGyms } from '../api/gym';
import { useTheme } from '../providers/ThemeProvider';
import { maxContentWidth, minTouch, radius, space } from '../theme';
import { Button } from './Button';
import { ListRow } from './Card';
import { Field } from './Field';
import { EmptyState, ErrorState, Loading } from './States';
import { Text } from './Text';

type Props = {
  value: string | null | undefined;
  onChange: (gymId: string | null) => void;
  error?: string;
  optional?: boolean;
};

export function GymPicker({ value, onChange, error, optional }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const gyms = useQuery({ queryKey: ['gyms'], queryFn: listGyms, staleTime: 5 * 60_000 });

  const selected = gyms.data?.find((g) => g.id === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gyms.data ?? [];
    return (gyms.data ?? []).filter((g) => `${g.name} ${g.city} ${g.state}`.toLowerCase().includes(q));
  }, [gyms.data, search]);

  const label = optional ? 'Gym (optional)' : 'Gym';
  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.name : 'none selected'}`}
        accessibilityHint="Opens the list of gyms"
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, borderWidth: error ? 2 : 1 },
        ]}
      >
        <Text muted={!selected} style={styles.flex} numberOfLines={1}>
          {selected ? `${selected.name}, ${selected.city}` : 'Choose your gym'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text variant="heading" style={styles.flex}>
                Choose a gym
              </Text>
              <Button label="Close" variant="ghost" compact onPress={() => setOpen(false)} />
            </View>
            <Field
              label="Search"
              placeholder="Gym name or city"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="search"
            />
            {optional && <Button label="I will choose later" variant="secondary" onPress={() => choose(null)} />}
            {gyms.isPending ? (
              <Loading label="Loading gyms" />
            ) : gyms.isError ? (
              <ErrorState error={gyms.error} onRetry={() => gyms.refetch()} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(g) => g.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                ListEmptyComponent={<EmptyState title="No gyms match" body="Try a different name or city." />}
                renderItem={({ item }) => (
                  <ListRow
                    title={item.name}
                    subtitle={`${item.city}, ${item.state}`}
                    onPress={() => choose(item.id)}
                    right={item.id === value ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : undefined}
                  />
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  flex: { flex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: minTouch + 4,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  sheet: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', padding: space.lg, gap: space.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  list: { gap: space.sm, paddingBottom: space.xl },
});
