import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, LayoutDashboard, UserCircle } from 'lucide-react';
import { AppShell, type NavGroup } from '../../components/shell/AppShell';
import { Button, Card, Field, Input, PageHeader, PasswordInput, Select, Skeleton, StatusBadge } from '../../components/ui';
import { changePassword } from '../../api/auth.api';
import { getProfile, updateProfile, type AccountProfile } from '../../api/profile.api';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore, type ThemeChoice } from '../../store/useThemeStore';
import { homeForRole } from '../../utils/roleHome';

const ROLE_LABEL: Record<AccountProfile['role'], string> = {
  SUPER_ADMIN: 'Super admin',
  GYM_ADMIN: 'Gym admin',
  MEMBER: 'Member',
  TRAINER: 'Trainer',
  STAFF: 'Staff',
};

function DetailsCard({ profile }: { profile: AccountProfile }) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState(profile.username);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = username.trim() !== profile.username || phone.trim() !== (profile.phone ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({ username: username.trim(), phone: phone.trim() });
      queryClient.setQueryData(['accountProfile'], updated);
      if (user && token) setAuth({ ...user, username: updated.username }, token);
      setPhone(updated.phone ?? '');
      setSaved(true);
    } catch {
      // The API interceptor already shows the server message.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-ink">Your details</h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" required error={error}>
            <Input autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value); setSaved(false); }} />
          </Field>
          <Field label="Phone" hint="Leave empty to remove your number.">
            <Input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} />
          </Field>
          <Field label="Email" hint="Your email is used to sign in and cannot be changed here.">
            <Input value={profile.email} readOnly />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!dirty}>Save changes</Button>
          {saved && <p role="status" className="text-sm font-medium text-success-ink">Saved</p>}
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [nextError, setNextError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    setNextError('');
    setConfirmError('');
    if (form.next.length < 8) {
      setNextError('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setConfirmError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      setDone(true);
    } catch {
      // The API interceptor already shows the server message.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-ink">Change password</h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <Field label="Current password" required>
          <PasswordInput autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" required error={nextError} hint="At least 8 characters.">
            <PasswordInput autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </Field>
          <Field label="Confirm new password" required error={confirmError}>
            <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!form.current || !form.next}>Update password</Button>
          {done && <p role="status" className="text-sm font-medium text-success-ink">Password updated</p>}
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const { data: profile, isLoading } = useQuery({ queryKey: ['accountProfile'], queryFn: getProfile });

  const nav: NavGroup[] = user
    ? [{ items: [{ to: homeForRole(user.role), label: 'Dashboard', icon: LayoutDashboard }, { to: '/profile', label: 'Profile', icon: UserCircle }] }]
    : [];

  return (
    <AppShell nav={nav} title="Profile">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        <PageHeader title="Profile" />

        {isLoading || !profile ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <Card>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-ink-muted">Role</dt>
                  <dd className="mt-0.5 font-medium text-ink">{ROLE_LABEL[profile.role]}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Gym</dt>
                  <dd className="mt-0.5 font-medium text-ink">{profile.gym?.name ?? 'Not linked to a gym'}</dd>
                </div>
                {profile.trainerStatus && (
                  <div>
                    <dt className="text-ink-muted">Trainer status</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5">
                      <StatusBadge status={profile.trainerStatus} />
                      {profile.trainerStatus === 'PENDING' && <Clock className="size-4 text-ink-muted" aria-hidden="true" />}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>

            <DetailsCard profile={profile} />
          </>
        )}

        <PasswordCard />

        <Card>
          <h2 className="font-semibold text-ink">Appearance</h2>
          <Field label="Theme" className="mt-4 max-w-xs">
            <Select value={theme} onChange={(e) => setTheme(e.target.value as ThemeChoice)}>
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Sessions</h2>
          <p className="mt-1 text-sm text-ink-muted">
            You stay signed in on this device until you log out. Use Log out in the account menu when you are on a shared computer.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
