import { Link } from 'react-router';
import { LegalPage, LegalSection } from '../components/LegalPage';

const link = 'font-medium text-accent-ink underline underline-offset-2';

export default function RefundPage() {
  return (
    <LegalPage path="/refund" updated="23 October 2026">
      <LegalSection title="1. Platform subscriptions (gym owners)">
        <p>A platform subscription is not refundable once its billing period has started. You can cancel at any time and the cancellation takes effect at the end of the period you have paid for, with no part refund.</p>
        <p>If a charge was taken by mistake because of a platform error, we refund it in full within 5 to 7 business days.</p>
      </LegalSection>
      <LegalSection title="2. Gym memberships (members)">
        <p>Refunds for a membership follow the cancellation policy of the gym you joined. Vajra Fitness does not decide member refunds, so please speak to your gym first.</p>
      </LegalSection>
      <LegalSection title="3. Duplicate or failed payments">
        <p>If you were charged twice, or charged without the service being activated, tell us within 7 days through the <Link to="/contact" className={link}>contact form</Link>. We check the payment and process a valid refund within 5 business days.</p>
      </LegalSection>
      <LegalSection title="4. How refunds are paid">
        <p>Approved refunds go back to the original payment method (UPI, bank account or card). Your bank usually takes 5 to 10 working days to show it.</p>
      </LegalSection>
      <LegalSection title="5. Disputes">
        <p>Raise a dispute through the <Link to="/contact" className={link}>contact form</Link>. Disputes are subject to the laws of India.</p>
      </LegalSection>
    </LegalPage>
  );
}
