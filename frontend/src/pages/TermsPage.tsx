import { LegalPage, LegalSection } from '../components/LegalPage';

const SECTIONS = [
  ['1. Membership rules', "By joining a gym through Vajra Fitness you agree to follow that gym's rules, respect staff and other members and use equipment with care. Memberships cannot be transferred to another person."],
  ['2. Payments and fees', "Membership fees are set by your gym and are paid in advance. Overdue fees can lead to a temporary suspension of your membership. Platform plan prices can change with 30 days' written notice to the gym owner."],
  ['3. Cancellation', 'You can cancel at any time by contacting your gym. Partial months and unused time are not refunded. The refund and cancellation policy has the details.'],
  ['4. Health and liability', 'Exercise carries risk. Vajra Fitness is not liable for injury, loss or damage to belongings at a gym. Speak to a doctor before starting a new training programme. The calculators on this site give estimates and are not medical advice.'],
  ['5. Gym owners and the platform', 'Gym owners agree to keep member records accurate, to follow applicable data protection law including the Digital Personal Data Protection Act, 2023, and not to use the platform to harm members or third parties.'],
  ['6. Intellectual property', 'The software, design and content of Vajra Fitness belong to Vajra Fitness and may not be copied, resold or redistributed without written permission.'],
];

export default function TermsPage() {
  return (
    <LegalPage path="/terms" updated="23 October 2026">
      {SECTIONS.map(([title, body]) => (
        <LegalSection key={title} title={title}>
          <p>{body}</p>
        </LegalSection>
      ))}
    </LegalPage>
  );
}
