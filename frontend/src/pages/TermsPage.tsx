import React from 'react';
import { Reveal } from '../components/Reveal';
import { usePageMeta } from '../hooks/usePageMeta';

const SECTIONS = [
  {
    title: '1. Membership Rules',
    body: 'By signing up for a Vajra Fitness membership, you agree to abide by all gym rules, respect staff and fellow members, and use equipment responsibly. Memberships are non-transferable.',
  },
  {
    title: '2. Payment & Fees',
    body: 'All fees must be paid in advance. Overdue fees may result in temporary suspension of your membership. We reserve the right to change pricing tiers with 30 days written notice.',
  },
  {
    title: '3. Cancellation Policy',
    body: 'Members can cancel their subscription at any time. However, there are no refunds for partial months or unused time. To cancel, please contact your local branch administrator.',
  },
  {
    title: '4. Liability Waiver',
    body: 'Exercise carries inherent risks. Vajra Fitness is not liable for any personal injuries, loss, or damage to personal property while on the premises. Members are advised to consult a physician before beginning any new exercise program.',
  },
  {
    title: '5. Platform Usage',
    body: 'Gym owners using the Vajra Fitness SaaS platform agree to maintain accurate member records, comply with applicable data protection laws (including the DPDP Act, 2023), and not misuse the platform to harm members or third parties.',
  },
  {
    title: '6. Intellectual Property',
    body: 'All software, design, and content on the Vajra Fitness platform are the intellectual property of Vajra Fitness and may not be copied, resold, or redistributed without prior written consent.',
  },
];

const TermsPage = () => {
  usePageMeta(
    'Terms & Conditions',
    'The terms and conditions governing your use of the Vajra Fitness platform, accounts, and services.',
    '/terms',
  );
  return (
    <div className="min-h-screen bg-[var(--color-base)] dark:bg-[#0d0d0d] overflow-x-hidden">
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl animate-blob" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-14">
            <span className="eyebrow">Legal</span>
            <h1 className="display mt-5 text-5xl md:text-6xl leading-[0.95]">
              Terms & <span className="text-gradient">Conditions</span>
            </h1>
            <p className="section-lead">Last updated: 1 August 2026 · Applies to all Vajra Fitness members and platform users</p>
          </Reveal>

          <div className="space-y-6">
            {SECTIONS.map((section, i) => (
              <Reveal key={section.title} delay={i * 60}>
                <div className="card-hover">
                  <h2 className="text-xl font-extrabold text-[var(--color-primary)] mb-3">{section.title}</h2>
                  <p className="text-[var(--color-charcoal)] leading-relaxed">{section.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
