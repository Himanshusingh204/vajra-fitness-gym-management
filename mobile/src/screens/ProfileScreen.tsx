import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile } from '../api/auth';
import { Button } from '../components/Button';
import { Card, ListRow } from '../components/Card';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { FormError } from '../components/States';
import { Text } from '../components/Text';
import { roleName, workGymId } from '../lib/roles';
import { name, optionalPhone } from '../lib/validation';
import { useAuth, useUser } from '../providers/AuthProvider';
import { useTheme, type ThemePreference } from '../providers/ThemeProvider';
import { space } from '../theme';

const schema = z.object({ username: name, phone: optionalPhone });
type Values = z.infer<typeof schema>;

export default function ProfileScreen() {
  const user = useUser();
  const { reloadUser, signOut } = useAuth();
  const { preference, setPreference, colors } = useTheme();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const { control, handleSubmit, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { username: user.username, phone: user.phone ?? '' },
  });

  const gymName =
    user.memberDetails?.gym.name ??
    user.trainerDetails?.gym.name ??
    user.staffDetails?.gym.name ??
    user.ownedGyms.find((g) => g.id === workGymId(user))?.name;

  const save = handleSubmit(async (v) => {
    setError(null);
    try {
      await updateProfile({ username: v.username, phone: v.phone || null });
      await reloadUser();
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  });

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert('Sign out?', 'You will need your password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen title="Profile">
      <Card>
        {editing ? (
          <>
            <FormError error={error} />
            <Controller
              control={control}
              name="username"
              render={({ field, fieldState }) => (
                <Field label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  error={fieldState.error?.message} autoComplete="name" />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <Field label="Mobile number" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  error={fieldState.error?.message} keyboardType="phone-pad" autoComplete="tel"
                  hint="Leave empty to remove it" />
              )}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button label="Cancel" variant="secondary" onPress={() => { reset(); setError(null); setEditing(false); }} />
              </View>
              <View style={styles.flex}>
                <Button label="Save" onPress={save} loading={formState.isSubmitting} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text variant="heading">{user.username}</Text>
            <Text muted>{user.email}</Text>
            <Text muted>{user.phone || 'No mobile number added'}</Text>
            <Text variant="small" muted>
              {[roleName[user.role], gymName].filter(Boolean).join(', ')}
            </Text>
            {saved && (
              <Text variant="small" color={colors.success} accessibilityLiveRegion="polite">
                Profile saved.
              </Text>
            )}
            <Button label="Edit details" variant="secondary" icon="create-outline" onPress={() => { setSaved(false); setEditing(true); }} />
          </>
        )}
      </Card>

      <ListRow title="Change password" onPress={() => router.push('/change-password')} />

      <View style={styles.section}>
        <Text variant="label">Theme</Text>
        <Segmented<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </View>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={confirmSignOut} />

      <Text variant="small" muted style={styles.center}>
        Vajra Fitness {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  section: { gap: space.sm },
  center: { textAlign: 'center' },
});
