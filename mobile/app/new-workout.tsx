import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createWorkout } from '@/api/gym';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import type { ExerciseItem } from '@/lib/format';
import { space } from '@/theme';

const blank = (): ExerciseItem => ({ exercise: '', sets: '', reps: '', notes: '' });

export default function NewWorkout() {
  const { memberId, name } = useLocalSearchParams<{ memberId: string; name?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<ExerciseItem[]>([blank()]);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<ExerciseItem>) =>
    setItems((list) => list.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));

  const save = async () => {
    const filled = items.filter((i) => i.exercise.trim());
    if (!filled.length) {
      setError('Add at least one exercise.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Same JSON format the web editor writes.
      await createWorkout(memberId, { title: title.trim() || undefined, exercises: JSON.stringify(filled) });
      await queryClient.invalidateQueries({ queryKey: ['member', 'workouts', memberId] });
      queryClient.invalidateQueries({ queryKey: ['gym'] });
      router.back();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['bottom']} subtitle={name ? `For ${name}` : undefined} title="Workout plan">
      <FormError error={error} />
      <Field label="Title (optional)" placeholder="Push day" value={title} onChangeText={setTitle} maxLength={120} />
      {items.map((item, i) => (
        <Card key={i}>
          <View style={styles.between}>
            <Text variant="label">Exercise {i + 1}</Text>
            {items.length > 1 && (
              <Button compact variant="ghost" label="Remove" onPress={() => setItems((l) => l.filter((_, idx) => idx !== i))} />
            )}
          </View>
          <Field label="Name" placeholder="Bench press" value={item.exercise} onChangeText={(v) => update(i, { exercise: v })} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field label="Sets" keyboardType="number-pad" value={item.sets} onChangeText={(v) => update(i, { sets: v })} />
            </View>
            <View style={styles.flex}>
              <Field label="Reps" value={item.reps} onChangeText={(v) => update(i, { reps: v })} />
            </View>
          </View>
          <Field label="Notes (optional)" value={item.notes} onChangeText={(v) => update(i, { notes: v })} />
        </Card>
      ))}
      <Button label="Add exercise" variant="secondary" icon="add" onPress={() => setItems((l) => [...l, blank()])} />
      <Button label="Save plan" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
