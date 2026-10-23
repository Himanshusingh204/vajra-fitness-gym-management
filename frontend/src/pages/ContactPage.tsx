import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { Button, Card, Field, Input, PageHeader, Textarea } from '../components/ui';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

const MAX_WORDS = 1000;
const PHONE = /^(\+?91[\s-]?)?([6-9]\d{9})$/;
const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export default function ContactPage() {
  useRouteMeta('/contact');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.phone && !PHONE.test(form.phone.replace(/[\s-]/g, ''))) next.phone = 'Use a 10-digit Indian mobile number starting with 6 to 9.';
    if (form.message.trim().length < 5) next.message = 'Write at least a few words.';
    else if (countWords(form.message) > MAX_WORDS) next.message = `Keep the message under ${MAX_WORDS} words.`;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    setFormError('');
    try {
      await api.post('/enquiries/contact', form);
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setFormError(apiError || 'The message did not go through. Please try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={pageSeo['/contact'].h1} description="Tell us what you need. Gym owners, members and trainers all use this form. We reply by email." />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Card>
          {sent ? (
            <div role="status" className="flex flex-col items-start gap-3 py-6">
              <CheckCircle2 className="size-8 text-success-ink" aria-hidden="true" />
              <h2 className="text-xl font-bold text-ink">Message sent</h2>
              <p className="text-ink-muted">Thanks for writing. We will reply to the email address you gave us.</p>
              <Button variant="secondary" onClick={() => setSent(false)}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required error={errors.name}>
                  <Input value={form.name} onChange={set('name')} autoComplete="name" maxLength={100} />
                </Field>
                <Field label="Email" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                </Field>
                <Field label="Mobile number" hint="Optional" error={errors.phone}>
                  <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                </Field>
                <Field label="Subject" hint="Optional">
                  <Input value={form.subject} onChange={set('subject')} maxLength={200} />
                </Field>
              </div>
              <Field label="Message" required error={errors.message}>
                <Textarea rows={6} value={form.message} onChange={set('message')} />
              </Field>
              {formError && (
                <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">
                  {formError}
                </p>
              )}
              <Button type="submit" loading={sending}>Send message</Button>
            </form>
          )}
        </Card>

        <aside className="space-y-4 text-ink-muted">
          <h2 className="font-semibold text-ink">Before you write</h2>
          <p>Most answers about plans, joining a gym and payments are on the <Link to="/faq" className="font-medium text-accent-ink underline underline-offset-2">FAQ</Link>.</p>
          <p>If you want your gym listed, <Link to="/register/partner" className="font-medium text-accent-ink underline underline-offset-2">register it here</Link> and it will go for approval.</p>
          <p>For a payment problem, include the date and amount so we can find it.</p>
        </aside>
      </div>
    </div>
  );
}
