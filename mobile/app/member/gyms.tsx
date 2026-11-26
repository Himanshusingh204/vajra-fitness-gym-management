import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getGymCities, searchGyms, type GymSearch } from '@/api/gym';
import type { PublicGym } from '@/api/types';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/Card';
import { Field } from '@/components/Field';
import { QueryList } from '@/components/QueryList';
import { Segmented } from '@/components/Segmented';
import { Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { minTouch, radius, space } from '@/theme';

type Filters = Omit<GymSearch, 'page'>;

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (v?: string) => void }) {
  const { colors } = useTheme();
  if (!options.length) return null;
  return (
    <View style={styles.chipGroup}>
      <Text variant="label">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(selected ? undefined : opt)}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border },
              ]}
            >
              <Text variant="label" color={selected ? colors.accent : colors.text}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const fromPrice = (g: PublicGym) => {
  const cheapest = g.membershipPlans?.[0];
  return cheapest ? `From ${formatMoney(cheapest.price)}` : 'No plans listed';
};

export default function FindGyms() {
  const router = useRouter();
  const [draft, setDraft] = useState<Filters>({ sort: 'relevance' });
  const [filters, setFilters] = useState<Filters>({ sort: 'relevance' });
  const cities = useQuery({ queryKey: ['gym-cities'], queryFn: getGymCities, staleTime: 5 * 60_000 });

  const gyms = useInfiniteQuery({
    queryKey: ['gym-search', filters],
    queryFn: ({ pageParam }) => searchGyms({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (pages.length * 12 < last.total ? last.page + 1 : undefined),
  });
  const items = gyms.data?.pages.flatMap((p) => p.items);

  // Facility chips come from the gyms on screen, and the chosen one always stays.
  const facilities = [...new Set([...(items ?? []).flatMap((g) => g.facilities ?? []), ...(filters.facility ? [filters.facility] : [])])].sort();

  // City and facility chips apply straight away; the text and price boxes wait for Search.
  const pick = (patch: Partial<Filters>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setFilters((f) => ({ ...f, ...patch }));
  };
  const clean = (v?: string) => v?.trim() || undefined;
  const search = () =>
    setFilters({ ...draft, q: clean(draft.q), minPrice: clean(draft.minPrice), maxPrice: clean(draft.maxPrice) });

  return (
    <QueryList
      title="Find gyms"
      subtitle="Compare gyms and plans near you."
      query={gyms}
      items={items}
      keyExtractor={(g) => g.id}
      onEndReached={() => {
        if (gyms.hasNextPage && !gyms.isFetchingNextPage) gyms.fetchNextPage();
      }}
      footer={gyms.isFetchingNextPage ? <Loading label="Loading more gyms" /> : undefined}
      header={
        <>
          <Field
            label="Search"
            placeholder="Gym, area or facility"
            value={draft.q ?? ''}
            onChangeText={(q) => setDraft((d) => ({ ...d, q }))}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCorrect={false}
          />
          <Chips label="City" options={cities.data ?? []} value={filters.city} onChange={(city) => pick({ city })} />
          <Chips label="Facility" options={facilities} value={filters.facility} onChange={(facility) => pick({ facility })} />
          <View style={styles.prices}>
            <View style={styles.flex}>
              <Field label="Min price" placeholder="0" keyboardType="number-pad" value={draft.minPrice ?? ''} onChangeText={(minPrice) => setDraft((d) => ({ ...d, minPrice }))} />
            </View>
            <View style={styles.flex}>
              <Field label="Max price" placeholder="Any" keyboardType="number-pad" value={draft.maxPrice ?? ''} onChangeText={(maxPrice) => setDraft((d) => ({ ...d, maxPrice }))} />
            </View>
          </View>
          <Segmented
            label="Sort by"
            value={filters.sort}
            options={[
              { value: 'relevance', label: 'Best match' },
              { value: 'price', label: 'Price' },
              { value: 'newest', label: 'Newest' },
            ]}
            onChange={(sort) => pick({ sort })}
          />
          <Button label="Search" icon="search-outline" onPress={search} />
        </>
      }
      renderItem={(g) => (
        <ListRow
          title={g.name}
          subtitle={`${g.city}, ${g.state} - ${fromPrice(g)}`}
          onPress={() => router.push({ pathname: '/gyms/[id]', params: { id: g.id } })}
        />
      )}
      empty={{ title: 'No gyms found', body: 'Try another city or clear a filter.' }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  prices: { flexDirection: 'row', gap: space.md },
  chipGroup: { gap: space.xs },
  chips: { gap: space.sm },
  chip: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1 },
});
