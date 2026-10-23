import { StyleSheet, View } from 'react-native';
import type { WorkoutSlip } from '../api/types';
import { formatDate, parseExercises } from '../lib/format';
import { useTheme } from '../providers/ThemeProvider';
import { space } from '../theme';
import { Card } from './Card';
import { Text } from './Text';

export function WorkoutCard({ slip, showMember }: { slip: WorkoutSlip; showMember?: boolean }) {
  const { colors } = useTheme();
  const items = parseExercises(slip.exercises);
  const by = showMember ? slip.member?.user.username : slip.trainer?.user.username;

  return (
    <Card>
      <Text variant="heading">{slip.title || 'Workout plan'}</Text>
      <Text variant="small" muted>
        {[
          `Assigned ${formatDate(slip.assignedDate)}`,
          slip.validUntil ? `until ${formatDate(slip.validUntil)}` : null,
          by ? (showMember ? `for ${by}` : `by ${by}`) : null,
        ]
          .filter(Boolean)
          .join(', ')}
      </Text>
      {items.length === 0 ? (
        <Text muted>No exercises listed.</Text>
      ) : (
        items.map((item, i) => (
          <View key={`${item.exercise}-${i}`} style={styles.item}>
            <View style={[styles.num, { backgroundColor: colors.accentSoft }]}>
              <Text variant="small" color={colors.accent}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="label">{item.exercise}</Text>
              {item.sets || item.reps ? (
                <Text variant="small" muted>
                  {[item.sets && `${item.sets} sets`, item.reps && `${item.reps} reps`].filter(Boolean).join(' x ')}
                </Text>
              ) : null}
              {item.notes ? (
                <Text variant="small" muted>
                  {item.notes}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  flex: { flex: 1 },
});
