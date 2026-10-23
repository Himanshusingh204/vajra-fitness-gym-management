import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { GymPicker } from '@/components/GymPicker';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { email, name, optionalPhone, password } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

const schema = z.object({
  username: name,
  email,
  phone: optionalPhone,
  password,
  gymId: z.string().nullable(),
});

type Values = z.infer<typeof schema>;

export default function RegisterMember() {
  const { signUpMember } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', phone: '', password: '', gymId: null },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await signUpMember({ ...v, phone: v.phone || undefined });
    } catch (err) {
      setError(err);
    }
  });

  return (
    <Screen title="Member account" subtitle="Your gym approves the membership request." edges={['bottom']}>
      <FormError error={error} />
      <Controller
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <Field label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} autoComplete="name" textContentType="name" />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field label="Email" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="emailAddress" />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Field label="Mobile number (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field label="Password" password value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} hint="At least 8 characters with a letter and a number"
            autoComplete="new-password" textContentType="newPassword" />
        )}
      />
      <Controller
        control={control}
        name="gymId"
        render={({ field }) => <GymPicker value={field.value} onChange={field.onChange} optional />}
      />
      <Button label="Create account" onPress={onSubmit} loading={formState.isSubmitting} />
    </Screen>
  );
}
