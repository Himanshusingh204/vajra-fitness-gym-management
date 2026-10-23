import { useRef, useState, type ComponentRef } from 'react';
import type { TextInput } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { Text } from '@/components/Text';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type Values = z.infer<typeof schema>;

export default function Login() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [error, setError] = useState<unknown>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err);
    }
  });

  return (
    <Screen title="Sign in" subtitle="Welcome back." edges={['bottom']}>
      <FormError error={error} />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            ref={passwordRef}
            label="Password"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => onSubmit()}
          />
        )}
      />
      <Button label="Sign in" onPress={onSubmit} loading={formState.isSubmitting} />
      <Link href="/forgot-password" style={{ alignSelf: 'center', paddingVertical: 12 }} accessibilityRole="link">
        <Text variant="label" color={colors.accent}>
          Forgot password?
        </Text>
      </Link>
    </Screen>
  );
}
