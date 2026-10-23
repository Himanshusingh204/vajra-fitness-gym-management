import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { GymPicker } from '@/components/GymPicker';
import { Screen } from '@/components/Screen';
import { FormError } from '@/components/States';
import { email, name, password, phone } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

const schema = z.object({
  username: name,
  email,
  phone,
  password,
  gymId: z.string({ invalid_type_error: 'Choose the gym you train at' }).min(1, 'Choose the gym you train at'),
  specialization: z.string().trim().max(80),
  experienceYears: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 60), 'Enter whole years, 0 to 60'),
  city: z.string().trim().max(80),
  bio: z.string().trim().max(600, 'Keep it under 600 characters'),
});

type Values = z.infer<typeof schema>;

const blankToNull = (v: string) => (v ? v : null);

export default function RegisterTrainer() {
  const { signUpTrainer } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', phone: '', password: '', gymId: '', specialization: '', experienceYears: '', city: '', bio: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await signUpTrainer({
        username: v.username,
        email: v.email,
        phone: v.phone,
        password: v.password,
        gymId: v.gymId,
        specialization: blankToNull(v.specialization),
        experienceYears: v.experienceYears ? Number(v.experienceYears) : null,
        city: blankToNull(v.city),
        bio: blankToNull(v.bio),
      });
    } catch (err) {
      setError(err);
    }
  });

  return (
    <Screen title="Trainer account" subtitle="The gym reviews your application before you can see clients." edges={['bottom']}>
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
          <Field label="Mobile number" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
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
        render={({ field, fieldState }) => (
          <GymPicker value={field.value || null} onChange={(id) => field.onChange(id ?? '')} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="specialization"
        render={({ field, fieldState }) => (
          <Field label="Specialisation (optional)" placeholder="Strength, yoga, CrossFit" value={field.value}
            onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="experienceYears"
        render={({ field, fieldState }) => (
          <Field label="Years of experience (optional)" value={field.value} onChangeText={field.onChange}
            onBlur={field.onBlur} error={fieldState.error?.message} keyboardType="number-pad" />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field, fieldState }) => (
          <Field label="City (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} autoComplete="postal-address-locality" />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <Field label="Short bio (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} multiline numberOfLines={4} style={{ minHeight: 96, textAlignVertical: 'top' }} />
        )}
      />
      <Button label="Send application" onPress={onSubmit} loading={formState.isSubmitting} />
    </Screen>
  );
}
