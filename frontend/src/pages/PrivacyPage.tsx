import React from 'react';
import { Link } from 'react-router';
import { usePageMeta } from '../hooks/usePageMeta';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-[var(--color-primary)] mb-3">{title}</h2>
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">{children}</div>
  </section>
);

const PrivacyPage = () => {
  usePageMeta(
    'Privacy Policy',
    'How Vajra Fitness collects, uses, and protects your personal data. Read our privacy policy to understand your rights.',
    '/privacy',
  );
  return (
  <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)]">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-3">Privacy Policy</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-12 text-sm">
        Last updated: 1 August 2026 · Effective for all Vajra Fitness platform users
      </p>

      <Section title="1. Information We Collect">
        <p>When you register or use the Vajra Fitness platform, we collect your name, email address, mobile number, and gym affiliation. Payment transactions are processed via Razorpay and we do not store card or bank details on our servers.</p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use your data exclusively to operate the platform: managing membership records, generating attendance logs, issuing fee receipts, and communicating service updates. We do not sell your data to third parties.</p>
      </Section>

      <Section title="3. Data Security">
        <p>All data is encrypted in transit via TLS 1.3 and stored within Indian data centers in compliance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>. Access to production databases is restricted to authorised personnel only.</p>
      </Section>

      <Section title="4. Data Retention">
        <p>Member records are retained for a minimum of 3 years in accordance with Indian GST regulations. You may request deletion of your account by contacting <a href="mailto:support@vajrafitness.in" className="text-[var(--color-primary)] hover:underline">support@vajrafitness.in</a>. Financial transaction records will be retained as legally required.</p>
      </Section>

      <Section title="5. Cookies">
        <p>We use session cookies for authentication only. No advertising or tracking cookies are used on this platform.</p>
      </Section>

      <Section title="6. Third-Party Services">
        <p>We integrate with Razorpay (payments), Fast2SMS (OTP delivery), and AWS (cloud infrastructure). Each operates under its own privacy policy.</p>
      </Section>

      <Section title="7. Contact">
        <p>For any privacy-related queries, write to us at <a href="mailto:privacy@vajrafitness.in" className="text-[var(--color-primary)] hover:underline">privacy@vajrafitness.in</a> or visit our <Link to="/contact" className="text-[var(--color-primary)] hover:underline">Contact page</Link>.</p>
      </Section>
    </div>
  </div>
  );
};

export default PrivacyPage;
