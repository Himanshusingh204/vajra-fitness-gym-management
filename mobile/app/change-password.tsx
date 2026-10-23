import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePassword } from '@/api/auth';
import { clearSession } from '@/api/session';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import { password } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a different password' });

type Values = z.infer<typeof schema>;

export default function ChangePassword() {
  const { signOut } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  // The server revokes every session on a password change, so the stored
  // refresh token is already dead. Clear it and send the user to sign in.
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await changePassword(v.currentPassword, v.newPassword);
      await clearSession();
      setDone(true);
    } catch (err) {
      setError(err);
    }
  });

  if (done) {
    return (
      <Screen edges={['bottom']}>
        <Card>
          <Text variant="heading" accessibilityLiveRegion="polite">
            Password changed
          </Text>
          <Text muted>For your security you have been signed out on every device. Sign in again with the new password.</Text>
          <Button label="Sign in again" onPress={() => signOut()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <FormError error={error} />
      <Controller
        control={control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <Field label="Current password" password value={field.value} onChangeText={field.onChange}
            onBlur={field.onBlur} error={fieldState.error?.message} autoComplete="current-password" textContentType="password" />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <Field label="New password" password value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} hint="At least 8 characters with a letter and a number"
            autoComplete="new-password" textContentType="newPassword" />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field, fieldState }) => (
          <Field label="Confirm new password" password value={field.value} onChangeText={field.onChange}
            onBlur={field.onBlur} error={fieldState.error?.message} autoComplete="new-password" textContentType="newPassword" />
        )}
      />
      <Button label="Change password" onPress={onSubmit} loading={formState.isSubmitting} />
    </Screen>
  );
}
