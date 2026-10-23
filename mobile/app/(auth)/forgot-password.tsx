import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPassword } from '@/api/auth';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import { email } from '@/lib/validation';

const schema = z.object({ email });

export default function ForgotPassword() {
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await forgotPassword(v.email);
      setSent(true);
    } catch (err) {
      setError(err);
    }
  });

  return (
    <Screen title="Reset your password" subtitle="We will email you a link to set a new one." edges={['bottom']}>
      {sent ? (
        <Card>
          <Text variant="label" accessibilityLiveRegion="polite">
            Check your email
          </Text>
          <Text muted>
            If an account exists for that address, a reset link is on its way. Open it on this phone or any browser, then sign in here with the new password.
          </Text>
        </Card>
      ) : (
        <>
          <FormError error={error} />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field label="Email" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                error={fieldState.error?.message} keyboardType="email-address" autoCapitalize="none"
                autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={() => onSubmit()} />
            )}
          />
          <Button label="Send reset link" onPress={onSubmit} loading={formState.isSubmitting} />
        </>
      )}
    </Screen>
  );
}
