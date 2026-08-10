import React from 'react';
import { Link } from 'react-router';
import { usePageMeta } from '../hooks/usePageMeta';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-[var(--color-primary)] mb-3">{title}</h2>
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">{children}</div>
  </section>
);

const CookiesPage = () => {
  usePageMeta(
    'Cookie Policy',
    'How Vajra Fitness uses cookies. We only set essential cookies to keep you signed in; we do not set advertising or tracking cookies.',
    '/cookies',
  );
  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[#0d0d0d]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-4xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-3">Cookie Policy</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-12 text-sm">Last updated: August 2026</p>

        <Section title="1. What cookies do we use?">
          <p>Vajra Fitness sets only <strong>essential cookies</strong> required for the platform to function:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>refreshToken</strong> — an httpOnly, SameSite=Strict cookie that keeps you signed in. It never stores your password and cannot be read by JavaScript.</li>
            <li><strong>vf-theme</strong> — remembers your light/dark theme preference on this device.</li>
            <li><strong>vf-cookie-consent</strong> — remembers that you have acknowledged this notice.</li>
          </ul>
        </Section>

        <Section title="2. Do we use tracking or advertising cookies?">
          <p>
            No. By default we do not set advertising, analytics, or cross-site tracking cookies.
            If analytics are enabled for the platform, they are privacy-respecting and do not use
            cross-site tracking cookies.
          </p>
        </Section>

        <Section title="3. Third-party cookies">
          <p>
            Certain features (such as embedded font delivery from Google Fonts) may contact
            third-party servers. These services may set their own cookies governed by their
            respective privacy policies.
          </p>
        </Section>

        <Section title="4. Managing cookies">
          <p>
            Essential cookies cannot be disabled without breaking sign-in and core functionality.
            You can clear cookies anytime through your browser settings. See our{' '}
            <Link to="/privacy" className="text-[var(--color-primary)] hover:underline">Privacy Policy</Link>{' '}
            for more information about how we handle your data.
          </p>
        </Section>

        <Section title="5. Contact">
          <p>
            Questions about cookies? Write to us at{' '}
            <a href="mailto:privacy@vajrafitness.in" className="text-[var(--color-primary)] hover:underline">privacy@vajrafitness.in</a>.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default CookiesPage;
