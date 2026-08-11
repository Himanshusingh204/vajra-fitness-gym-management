import React from 'react';
import { Link } from 'react-router';
import { usePageMeta } from '../hooks/usePageMeta';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-[var(--color-primary)] mb-3">{title}</h2>
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">{children}</div>
  </section>
);

const RefundPage = () => {
  usePageMeta(
    'Refund & Cancellation Policy',
    'Vajra Fitness refund and cancellation policy for membership plans and payments.',
    '/refund',
  );
  return (
  <div className="min-h-screen bg-[var(--color-base)] dark:bg-[var(--color-base)]">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-4xl font-extrabold text-[var(--color-deepgray)] dark:text-white mb-3">Refund & Cancellation Policy</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-12 text-sm">
        Last updated: 1 August 2026 · Governs all Vajra Fitness subscription and membership transactions
      </p>

      <Section title="1. SaaS Platform Subscriptions (Gym Owners)">
        <p>Monthly and annual platform subscriptions are non-refundable once the billing cycle has commenced. Gym owners may cancel their subscription at any time — cancellation takes effect at the end of the current paid period with no pro-rated refunds.</p>
        <p>If a subscription charge was incorrectly debited due to a platform error, a full refund will be processed within <strong>5–7 business days</strong>.</p>
      </Section>

      <Section title="2. Member Gym Memberships">
        <p>Membership fee refund eligibility is determined by the individual gym branch and their own cancellation policy. Vajra Fitness platform does not directly control member refund decisions — please contact your enrolled gym branch directly.</p>
      </Section>

      <Section title="3. Duplicate or Failed Payments">
        <p>In the event of a duplicate charge or a payment deducted where the service was not activated, raise a request at <a href="mailto:billing@vajrafitness.in" className="text-[var(--color-primary)] hover:underline">billing@vajrafitness.in</a> within 7 days. We will verify and process the refund within 5 business days.</p>
      </Section>

      <Section title="4. Refund Process">
        <p>Approved refunds are credited back to the original payment source (UPI, bank account, or card). Processing time depends on your bank and typically takes 5–10 working days post-approval.</p>
      </Section>

      <Section title="5. Contact for Disputes">
        <p>Raise a ticket at <Link to="/contact" className="text-[var(--color-primary)] hover:underline">Contact Us</Link> or email <a href="mailto:billing@vajrafitness.in" className="text-[var(--color-primary)] hover:underline">billing@vajrafitness.in</a>. All disputes are subject to the jurisdiction of courts in Jodhpur, Rajasthan.</p>
      </Section>
    </div>
  </div>
  );
};

export default RefundPage;
